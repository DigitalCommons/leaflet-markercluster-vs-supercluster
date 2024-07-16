
// A utility for reading from chunks in a queue
//
class ChunkAccumulator {
  constructor(reader) {
	  this.reader = reader;
	  this.chunks = [];
	  this.cursor = 0;
  }

  // Counts the total bytes in the chunks, including the "done" chunk
  byteCount() {
	  let count = 0;
	  for(const chunk of this.chunks) {
	    if (chunk?.value?.length)
		    count += chunk.value.length;
	  }
	  return count;
  }

  done() {
	  return this.chunks.length > 0 && this.chunks[this.chunks.length-1].done;
  }
  
  // Pull until targetCount reached. Returns the total byteCount
  // afterwards (which may be less than targetCount if the stream is
  // done).
  async pull(targetCount = 1) {
	  let count = this.byteCount();
	  while(count < targetCount && !this.done()) {
	    const chunk = await this.reader.read();
	    if (chunk?.value?.length) 
		    count += chunk.value.length;
	    this.chunks.push(chunk);	    
	    // console.debug("pull", this.stats());
	  }
	  return count;
  }

  // Concatenates the chunks into one. (If there are none, an empty one is created)
  // Includes any data in the "done" chunk
  concatChunks() {
	  if (this.chunks.length === 1)
	    return this.chunks[0];

	  const count = this.byteCount();
	  const combined = new Uint8Array(count);
	  let lastDone = false;
	  let ix = 0;
	  for(const chunk of this.chunks) {
	    lastDone = chunk.done;
	    if (chunk.value) {
		    combined.set(chunk.value, ix);
		    ix += chunk.value.length;
	    }
	  }

	  const chunk = {done: lastDone, value: combined};
	  this.chunks = [chunk];
	  return chunk;
  }

  // Returns an array of information about the chunks (size and status)
  stats() {
	  return this.chunks.map(c => ({length: c.value?.length, done: c.done}));
  }
}


// Reads byte blocks from a ChunkAccumulator
class BlockReader {

  // constructor
  constructor(chunkAcc) {
	  this.acc = chunkAcc;
	  this.cursor = 0;
	  this.data = new Uint8Array();
  }

  // Reads a block of data of the given size (default 1 byte)
  // Returns true if there is more data to read, false otherwise.
  // Sets the data property to a Uint8Array in either case (which may be
  // smaller than size in the latter case)
  async readBlock(size = 1) {
	  // Ensure there is enough data
	  const requiredSize = this.cursor + size;
	  const totBytes = await this.acc.pull(requiredSize);

	  // Did we get enough?
	  if (totBytes < requiredSize) {
	    // Assume EOS, return all the data we have (which is < size)
	    this.data = this.acc.concatChunks().value.subarray(this.cursor);
	    return false;
	  }

	  // We got enough data. There is at least one chunk.
	  let chunk0 = this.acc.chunks[0];
	  // console.debug("chunk", totBytes, requiredSize, chunk0?.value.length);

	  // Drop the chunk if it's all been read,
	  // then call ourselves recursively to get the data
	  const chunk0size = chunk0.value.length;
	  if (this.cursor > chunk0size) {
	    // FIXME this seems never to get called?
	    this.cursor -= chunk0size;
	    this.acc.chunks.shift();
	    // console.debug("shift, recurse");
	    return await this.readBlock(size);
	  }

	  // We have some unread data in the chunk. We already
	  // established there is enough data in the queue overall
	  // console.debug("assert enough data", totBytes-this.cursor > size); 
	  
	  // Is it all in chunk0?
	  if (this.cursor+size <= chunk0size) {
	    // Simple case - just get data from chunk0
	    this.data = chunk0.value.subarray(this.cursor, this.cursor+size);
	    // console.debug("simple", {length:this.data.length, cursor: this.cursor, size});
	    // console.debug("assert data size", this.data.length === size);
	    this.cursor += size;
	    return true;
	  }

	  // We need to concatenate chunks
	  this.data = new Uint8Array(size);

	  // Store the final part from chunk0
	  let portion = chunk0.value.subarray(this.cursor);
	  this.data.set(portion);
	  this.cursor = 0;

	  let cursor2 = portion.length;
	  while(cursor2 < size) {
	    // drop chunk 0
	    // console.debug("drop chunk 0");
	    this.acc.chunks.shift();

	    chunk0 = this.acc.chunks[0];

	    // If the chunk is bigger than the required bytes,
	    // take the appropriate portion of it.
	    if (chunk0.value.length > size-cursor2) {
		    this.cursor = size-cursor2;
		    // console.debug("chunk is bigger than required", this.cursor);
		    portion = chunk0.value.subarray(0, this.cursor);
		    this.data.set(portion, cursor2);
		    return true;
	    }

	    // Take the whole chunk and keep looping.
	    this.data.set(chunk0.value, cursor2);
	    cursor2 += chunk0.value;
	  }
	  
	  return true;
  }
  
}


function fromInt32(ary) {
  return ((ary[0]<<24) + (ary[1]<<16) + (ary[2]<<8) + ary[3]);
}
function fromUInt32(ary) {
  return ((ary[0]<<24) + (ary[1]<<16) + (ary[2]<<8) + ary[3])>>>0;
}
function uint32ToRange(val, lower, upper) {
  return (val/0xffffffff)*(upper-lower)+lower;
}

// Reads 
async function fetchData(url) {
  let response = await fetch(url);
  const utf8Decoder = new TextDecoder("utf-8");    
  /*    let reader = response.body.getReader();
	      let { value: chunk, done: readerDone } = await reader.read();

	      chunk = chunk ? utf8Decoder.decode(chunk, { stream: true }) : "";
	      console.log(chunk, readerDone);    */
  
  /*    for await (const chunk of readChunks(response.body, 8, 5 )) {
	      
	      console.log("got chunk", chunk.length);
	      }*/

  const acc = new ChunkAccumulator(response.body.getReader());
  const breader = new BlockReader(acc);

  const dataBlockSize = 4+4 + 4 + 1;

  const data = [];
  while(await breader.readBlock(dataBlockSize)) {
	  const [lat0, lat1, lat2, lat3, lng0, lng1, lng2, lng3, cat1, cat2, cat3, cat4, strSize] = breader.data
	  //appendFileSync("out", breader.data);

	  const lat = uint32ToRange(fromUInt32(breader.data.subarray(0, 4)), -90, 90);
	  const lng = uint32ToRange(fromUInt32(breader.data.subarray(4, 8)), -180, 180);

	  await breader.readBlock(strSize);
	  //appendFileSync("out", breader.data);

	  const name = utf8Decoder.decode(breader.data);

	  const row = [name, lat, lng, cat1, cat2, cat3, cat4];
	  data.push(row);
	  //console.log('read', row);
	  if (data.length % 10000 === 0) console.log("reading...", data.length);
  }
  //appendFileSync("out", breader.data);    
  console.log('remainder', breader.data.length, data.length);

  return data;
}

export {
  fetchData,
  ChunkAccumulator,
  BlockReader,
  fromUInt32,
  fromInt32,
  uint32ToRange,
};


// Iterator function for `count` fixed-size chunks of `size` bytes, passed as a Uint8Array
//
// On completion
export async function* readChunks(readableBuf, bytes, count = undefined) {
  const buf = Uint8Array(bytes);
  let ox = 0;
  let ix = 0;
  while(count > 0) {
	  for await (const chunk of readableBuf) {
	    // Chunk is a Uint8Array
	    
	    for (const byte of chunk) {
		    if (ox >= bytes) {
		      yield buf;
		      ox = 0;
		      if (--count <= 0)
			      return Uint8Array(chunk, ix+1); // return remainder of the chunk
		    }
		    buf[ox++] = byte;
		    ix++;
	    }
	  }
  }
}

export async function delimitedRead(readableBuf, cb, count, delim = 0) {
  try {
    
    const buf = []; 
    for await (const chunk of readableBuf) {
	    // Chunk is a Uin8Array
	    
	    for (const byte of chunk) {
	      if (byte === delim) {
		      cb(buf);
		      buf.length = 0;
	      } else {
		      buf.push(byte);
	      }
	    }
    }      
  } catch (e) {
    console.error(e);
  }
}

// Adapted from https://developer.mozilla.org/en-US/docs/Web/API/ReadableStreamDefaultReader/read
export async function* makeTextFileLineIterator(fileURL) {
  const utf8Decoder = new TextDecoder("utf-8");
  let response = await fetch(fileURL);
  let reader = response.body.getReader();
  let { value: chunk, done: readerDone } = await reader.read();
  chunk = chunk ? utf8Decoder.decode(chunk, { stream: true }) : "";
  
  let re = /\r\n|\n|\r/gm;
  let startIndex = 0;
  
  for (;;) {
	  let result = re.exec(chunk);
	  if (!result) {
	    if (readerDone) {
		    break;
	    }
	    let remainder = chunk.substr(startIndex);
	    ({ value: chunk, done: readerDone } = await reader.read());
	    chunk =
		    remainder + (chunk ? utf8Decoder.decode(chunk, { stream: true }) : "");
	    startIndex = re.lastIndex = 0;
	    continue;
	  }
	  yield chunk.substring(startIndex, result.index);
	  startIndex = re.lastIndex;
  }
  if (startIndex < chunk.length) {
	  // last line didn't end in a newline char
	  yield chunk.substr(startIndex);
  }
}

export async function delimitedFetch(url) {
  const response = await fetch(url);
  if (!response.ok) {
	  throw new Error(`Response status: ${response.status}`);
  }
  const cb = (buf) => {
	  const string = buf.toString(); // FIXME convert
	  console.log(string);
  };
  
  return delimitedRead(response.body, cb, 10);
}




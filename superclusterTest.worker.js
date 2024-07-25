
// modules seem not to have full support yet:
// https://caniuse.com/?search=module%20worker
//import "https://unpkg.com/supercluster@7.1.3/dist/supercluster.min.js"
self.importScripts("https://unpkg.com/supercluster@7.1.3/dist/supercluster.min.js");

/*console.log = (...x) => {

  postMessage({subtype: 'log', data: x});
}*/

console.log("worker started...");

async function main () {
  console.log("worker mainstarted...");

  async function loadLatLngBlock(uri) {
    console.log(`starting fetch of ${uri} at ${new Date().toUTCString()}`);
    const res = await fetch(uri)
    console.log(`fetched ${uri} at ${new Date().toUTCString()}`);
    const blob = await res.blob();
    console.log(`got blob of size ${blob.size} from ${uri} at ${new Date().toUTCString()}`);
    const data = await blob.arrayBuffer();
    console.log(`got buffer from ${uri} at ${new Date().toUTCString()}`);
    return data;
  }

  let initPoints = [];
  let index;
  onmessage = (event) => {
//    console.log("Worker received"):
    const {subtype, data} = event?.data;
    switch(subtype) {
    case 'recluster':
      console.log("Message received from main script", data);
      const points = initPoints ?? index.getClusters(data.bbox, data.zoom);
      console.log("clusters");
      postMessage({subtype: 'recluster', data: points});
      break;
    default:
      console.log("Unknown message subtype ",subtype);
      postMessage({subtype:'log',data:'unknown message subtype '+subtype});
      break;
    }
  };

  // Create a supercluster instance
  performance.mark("new-supercluster-start")
  index = new Supercluster({
    radius: 60,
    extent: 256,
    maxZoom: 18,
  });
  performance.measure("new-supercluster-complete", "new-supercluster-start");


  // Generate GeoJSON points from the positions
  function data2GeoJson(markersData) {
    return markersData.map((asset) => {
	    const lng = asset.pos.lng;
	    const lat = asset.pos.lat;
	    return {
	      type: "Feature",
	      geometry: {
		      type: "Point",
		      coordinates: [lng, lat],
	      },
	      properties: { name: `${lat}, ${lng}` },
	    };
    });
  }
  function data2GeoJson2(markersData) {
    return markersData.map((asset) => {
	    const [name, lat, lng] = asset;
	    return {
	      type: "Feature",
	      geometry: {
		      type: "Point",
		      coordinates: [lng, lat],
	      },
	      properties: {
		      name,
		      //		cat1, cat2, cat3, cat4
	      },
	    };
    });
  }
  function data2GeoJson3(ab, size) {
    const dv = new DataView(ab);  
    const gj = [];
    for(let ix = 0; ix < size; ix++) {
      const lat = dv.getFloat32(ix*8);
      const lng = dv.getFloat32(ix*8+4);
      gj.push({
	      type: "Feature",
	      geometry: {
		      type: "Point",
		      coordinates: [lng, lat],
	      },
	      properties: {
		      //name,
		      //		cat1, cat2, cat3, cat4
	      },
	    });

      //console.log(ix, val);
    }
    console.log("got ",gj.length," points, ",gj[0]);
    return gj;
  }

  console.log(`getting init_points.bin at ${new Date().toUTCString()}`);    
  const initData = await loadLatLngBlock('./initpoints.bin');
  initPoints = data2GeoJson3(initData, initData.byteLength / 8);
  
  postMessage({subtype: 'recluster', data: initPoints});
  console.log(`done adding init_points.bin markers at ${new Date().toUTCString()}`);      
  
  const data = await loadLatLngBlock('./points.bin');
  console.log(`points 2 geojson starting at ${new Date().toUTCString()}`);    
  const points = data2GeoJson3(data, data.byteLength / 8);
  
  console.log(`supercluster indexing at ${new Date().toUTCString()}`); 
  performance.mark("supercluster-load-start");
  index.load(points);
  initPoints = undefined; // Prevent use of this anymore
  postMessage({subtype: 'indexComplete'});
 
  performance.measure("supercluster-load-complete", "supercluster-load-start");
  console.log(`got supercluster index at ${new Date().toUTCString()}`);
  console.log("INDEX", index);
  
}

main();

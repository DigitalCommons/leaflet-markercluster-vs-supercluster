import "https://maxwell-ilai.github.io/Leaflet.SidePanel/dist/leaflet-sidepanel.min.js"
import van from "https://cdn.jsdelivr.net/gh/vanjs-org/van/public/van-1.5.0.min.js"
import { fetchData } from "./data-fetching.js";

const map = L.map("map", {
  center: [39.6444, -104.98793],
  zoom: 3,
  preferCanvas: true,
});

new L.tileLayer("https://{s}.tile.osm.org/{z}/{x}/{y}.png", {
  attribution: `&amp;copy <a href="http://osm.org/copyright">OpenStreetMap</a> contributors`,
  detectRetina: true,
}).addTo(map);

const markerIcon = L.icon({
  iconSize: [25, 41],
  iconAnchor: [10, 41],
  popupAnchor: [2, -40],
  iconUrl: `https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png`,
  shadowUrl: "https://unpkg.com/leaflet@1.5.1/dist/images/marker-shadow.png",
});

let mcg = null;

const generateMarkers = (count) => {
  const southWest = new L.latLng(39.60463011823322, -105.0667190551758);
  const northEast = new L.latLng(39.68393975392733, -104.90947723388673);
  const bounds = new L.latLngBounds(southWest, northEast);

  const minLat = bounds.getSouthWest().lat,
        rangeLng = bounds.getNorthEast().lat - minLat,
        minLng = bounds.getSouthWest().lng,
        rangeLat = bounds.getNorthEast().lng - minLng;

  const result = Array.from({ length: count }, (v, k) => {
    return {
      id: k,
      pos: new L.latLng(
        minLat + Math.random() * rangeLng,
        minLng + Math.random() * rangeLat
      ),
    };
  });
  return result;
};

// Generate random marker positions
const markerCount = 500000;
const markersData = generateMarkers(markerCount);

console.log(`${markerCount} markers created at ${new Date().toUTCString()}`);




const markers = L.geoJson(null, {
  pointToLayer: createClusterIcon,
});

//import('./superclusterTest.worker.js');
const worker = new Worker('superclusterTest.worker.js');
worker.onerror = (error) => console.log("worker error:", error);

// Callback to get the clusters on pan and zoom
function reCluster() {
  console.log("reCluster");
  const zoom = map.getZoom();
  const bounds = map.getBounds();
  const bbox = [
    bounds.getWest(),
    bounds.getSouth(),
    bounds.getEast(),
    bounds.getNorth(),
  ];
  worker.postMessage({subtype: 'recluster', data: {bbox, zoom}});
}

function onReCluster(clusters) {
  console.log("onReCluster",clusters.length);
  markers.clearLayers();
  markers.addData(clusters);
}

map.on('zoomend viewreset load moveend zoomlevelschange ', reCluster);

// Callback to spiderify a (top-level) cluster
let spidermarkers = [];
function spider(e) {
  console.log("spider", e, this);
  unspider();
  if (this.feature.properties.cluster) {
    const children = index
          .getChildren(this.feature.properties.cluster_id)
          .filter(f => !f.properties.cluster);
    console.log("children", children);
    const center = map.latLngToLayerPoint(this.latlng);
    const points = generatePointsCircle(children.length, center);
    points.forEach((point, ix) => {
      const newPos = map.layerPointToLatLng(point);
      const m = createClusterIcon(children[ix], newPos);
      if (m.setZIndexOffset) {
        m.setZIndexOffset(1000000); //Make these appear on top of EVERYTHING
      }

      spidermarkers.push(m);
      map.addLayer(m);
    });

    return;
    
    function generatePointsCircle(count, centerPt) {
      const spiderfyDistanceMultiplier = 3;
      const circleFootSeparation = 2;
      const TWOPI = 3.1415926535927 * 2;
      const circumference = spiderfyDistanceMultiplier * circleFootSeparation * (2 + count);
      const res = [];
      const clusterIconRadius = 35; // Minimum distance to get outside the cluster icon.
      const legLength = clusterIconRadius;
      
      res.length = count;

      const threshold = 11.3; // a deliberately unharmonious number
      const [spiralStep, angleStep] = count > threshold?
            [legLength * 1.5 / threshold, TWOPI / threshold] :
            [0, TWOPI / count];
      
      for (let i = 0; i < count; i++) { // Clockwise, like spiral.
        const length = legLength + i*spiralStep;
        const angle = 0 + i*angleStep;
        res[i] = new L.Point(centerPt.x + length * Math.cos(angle),
                             centerPt.y + length * Math.sin(angle))._round();
      }
      
      return res;
    };
  }
}

function unspider(e) {
  spidermarkers.map(m => map.removeLayer(m));
  spidermarkers = [];
}

function createClusterIcon(feature, latlng) {
  let opts = {}; 
  if (feature.properties.cluster) {
    
    const count = feature.properties.point_count;
    const size = count < 100 ? "small" : count < 1000 ? "medium" : "large";
    opts.icon = L.divIcon({
      html: `<div><span>${feature.properties.point_count_abbreviated}</span></div>`,
      className: `marker-cluster marker-cluster-${size}`,
      iconSize: L.point(40, 40),
    });
    
  }
  else {
    opts.title = feature.properties.name;
  }
  
  
  const marker = L.marker(latlng, opts);
  marker.on('click', spider, {feature, latlng});
  return marker;
}

function mkDirectory(data) {
  const { div, li, ul } = van.tags;
  const items = {};
  for(const datum of data) {
	  items[datum[0][5]] = 1;
  }
  
  const Directory = () => 
	      ul(
	        {class: 'directory-list'},
	        Object.keys(items).map(
		        item => li(
		          {class:'directory-item'},
		          item
		        )
	        )
	      );
  return Directory;
}



const panelRight = L.control.sidepanel(
  'mySidepanelLeft', {
	  panelPosition: 'left',
	  tabsPosition: 'top',
	  pushControls: true,
	  startTab: 'tab-1'
  });
  
  
  
async function main() {

  //van.add(documWent.getElementById('directory'), mkDirectory(data));
  
}
worker.onmessage = (event) => {
  const {subtype, data} = event.data;
  //console.log(">>",event);

  switch(subtype) {
  case 'indexComplete':
    reCluster();
    break;
    
  case 'recluster':
    onReCluster(data);
    break;
  case 'log':
    console.log(data);
    break;
  default:
    console.log("eh?", event);
  }
}

main();


panelRight.addTo(map);
markers.addTo(map);
console.log("done");

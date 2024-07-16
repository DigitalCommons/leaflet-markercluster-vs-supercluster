// -*- javascript -*-
import fs from "fs";
import { fetchData } from "./data-fetching.js";
// import { dumpDataAsJSON } from "./dump-json.js";

fetchData('http://localhost:8000/data500k.bin')
  .then((data) => {
	  // dumpDataAsJSON("data500k2.json", data);
	  console.log("done");
  });



// -*- javascript -*-
import fs from "fs";
import { fetchData } from "./data-fetching.js";

const url = 'http://localhost:8000/data500k.json';

fetchData(url)
  .then((data) => {
    console.log("done");
  });



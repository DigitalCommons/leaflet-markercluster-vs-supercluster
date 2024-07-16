// For when we need to convert the binary data...
export function dumpDataAsJSON(filename, data) {
  data = JSON.stringify(data, replacer);
  console.log(typeof data);
  fs.writeFileSync(filename, data);

  function replacer(key, value) {
    // limit precision of floats
	  const places = 4;
    if (typeof value === 'number') {
      return parseFloat(value.toFixed(places));
    }
	  return value;
  }
}


# Identified bottlenecks

- loading data (somewhat, depending)
- parsing and processing data (bigger hit for large datasets)
  - binary formats are not necessarily a win, because of client-side JSON optimisation
  - except perhaps something like Google's Protobuf?
- cluster indexing
  - esp with Leaflet's MarkerCluster
  - Supercluster much better
    - Works with 500k pins quickly once indexed, index delay is
      acceptable (very small number of seconds)
    - but: requires re-indexing whenever visible pins change
	- and: does not come with a lot fo MarkerCluster's functionality, like spidering or pan-zoom to pins
	- this functionality can be re implemented with a little effort
  - perhaps mapbox overall win (but at the expense of requiring 3p service)
    - [Wikipedia][wp-mapbox]: "By 2020, Mapbox switched to a proprietary software license for most of the software it previously maintained as open source"
- probably searching (need to test this)
  - text especially
  - category filtering
	
# Possible workarounds
- preformat JSON on server rather than parsing and upacking (CSV, binary formats)
- but observe guidelines (short keys, avoid nesting, prefer arrays, avoid long decimals, minimal data in initial load)
- ensure [http/2 and transport compression enabled][http2]
- utilise caching where possible
- use protobuf?
- use server-side indexing? (send only current cluster pins)
  - needs back-end (pre)processing
  - use [websocket][http2vsws]/[SSE][wsvssse] for fast server-to-client communication?
    - SSE can work on top of HTTP/2
	- WS is separate non-compatible, somewhat complex protocol, and:	
      - No support for compression
      - No support for HTTP/2 multiplexing
      - Potential issues with proxies
      - No protection from Cross-Site Hijacking
  - might the server become the bottleneck?
- store minimal/lightweight category using integers/bitfields 
  - process on indexing
  - server-side text search

[http2]: https://www.mitrahsoft.com/blog/apache-http-2-and-gzip-compression
[http2vsws]: https://thinhdanggroup.github.io/websocket-vs-http2/
[wsvssse]: https://germano.dev/sse-websockets/
[wp-mapbox]: https://en.wikipedia.org/wiki/Mapbox


# Data speed research

JSON blows BSON out of the water in the browser
https://stackoverflow.com/questions/36767310/why-is-json-faster-than-bson-in-node-js

JSON alternatives (although perhaps not written in the context of
browsers).  Comment: "While protocol buffers and other binary options
undoubtedly provide performance and capabilities that JSON doesn't, I
think it undersells how much HTTP compression and HTTP/2 matter."

https://dev.to/nikl/json-is-slower-here-are-its-4-faster-alternatives-2g30


Mosly useful for some tips for optimising JSON.
https://medium.com/@shipshoper986/optimizing-data-serialization-faster-alternatives-to-json-a3685d210088

Benchmarks
https://github.com/Adelost/javascript-serialization-benchmark

Very good Auth0 blog article about their benchmark comparisons of
protobuf with JSON.  "Protobuf, the binary format crafted by Google,
surpasses JSON performance even on JavaScript environments like
Node.js/V8 and web browsers. [...] In our tests, it was demonstrated
that this protocol performed up to 6 times faster than JSON."

"If we were to use only JavaScript environments, like Node.js
applications and web browsers as interfaces, I would think twice
before investing time on learning and migrating endpoints to
Protobuf. But, when we start adding other platforms, like Java,
Android, Python, etc, then we start to see real gains on using
Protobuf."

https://auth0.com/blog/beating-json-performance-with-protobuf/


Someone's account of optimising binary data parsing in Javascript.
"What does not work: Profiling. [..] Your code may not be very
profilable. [...] It works in some situations, but in my case, and
many other cases, it provided very little value."

"[... Also:] Taking performance advice from strangers"

"I  have only  found  one technique  that  continuously produced  good
results for me. Benchmark driven development."

"Well, you start by creating a function you want to benchmark. [...]
Implement the minimal amount of code that is useful to you. [...]
Benchmark it. [...] keep running the benchmark and tweak your code
trying to make it stay fast while adding features."

"Doing this will allow you to gain an intuitive understanding of the
performance impacts your coding decisions really have. You will learn
that most performance tips you have heard of are complete bullshit in
your context, and some others produce amazing results."

"Here are a few things I learned from applying this technique, but
they are just examples. Please do not attempt similar optimizations
unless you are solving the same problem as me:
- try...catch is ok
- big switch statements = bad
- function calls are really cheap
- buffering / concatenating buffers is ok
- eval is awesome (when using its twin new Function(), eval() itself sucks)"

https://github.com/felixge/faster-than-c


Long lat/lng decimals will bloat the data.
Lat/Lng needs about 23-32 bits for metre or sub-metre precision.
(23 bits is what float32, JS's native number format, provides)

In decimal this is about 4dp.
https://www.explainxkcd.com/wiki/index.php/2170:_Coordinate_Precision

Limiting float precision can be done for JSON in Javascript (quite
simple it turns out). This could be used to generate smaller datasets ahead of time.
https://gist.github.com/liabru/11263868
https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/JSON/stringify

Likewise the parser can be customised, potentially allowing unpacking
of hex or base64 strings, for example. Unclear if this affects
performance however.
https://joeattardi.dev/customizing-jsonparse-and-jsonstringify

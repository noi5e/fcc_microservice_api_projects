<p>Microservice API Projects for FreeCodeCamp</p>

<p>
<b>Timestamp Microservice:</b>
 http://warm-refuge-75685.herokuapp.com/timestamp<ul>
<li>User Story: I can pass a string as a parameter, and it will check to see whether that string contains either a unix timestamp or a natural language date (example: January 1, 2016).</li>
<li>User Story: If it does, it returns both the Unix timestamp and the natural language form of that date.</li>
<li>User Story: If it does not contain a date or Unix timestamp, it returns null for those properties.</li>
</ul>
</p>

<p>
<b>Request Header Parser Microservice:</b>
 http://warm-refuge-75685.herokuapp.com/request-header-parser<ul>
<li>User Story: I can get the IP address, language and operating system for my browser.</li>
</ul>
</p>

<p>
<b>URL Shortener Microservice:</b> http://warm-refuge-75685.herokuapp.com/url-shortener
<ul>
<li>User Story: I can pass a URL as a parameter and I will receive a shortened URL in the JSON response.</li>
<li>User Story: If I pass an invalid URL that doesn't follow the valid http://www.example.com format, the JSON response will contain an error instead.</li>
<li>User Story: When I visit that shortened URL, it will redirect me to my original link.</li>
</ul>
</p>

<p>
<b>Image Search Astraction Layer:</b> http://warm-refuge-75685.herokuapp.com/latest/imagesearch
<ul>
<li>User Story: I can get the image URLs, alt text and page urls for a set of images relating to a given search string.</li>
<li>User Story: I can paginate through the responses by adding a ?offset=2 parameter to the URL.</li>
<li>User Story: I can get a list of the most recently submitted search strings.</li>
</ul>

<p>
<b>File Metadata Microservice:</b> http://warm-refuge-75685.herokuapp.com/filemetadata
<ul>
<li>User Story: I can submit a FormData object that includes a file upload.</li>
<li>User Story: When I submit something, I will receive the file size in bytes within the JSON response</li>
</ul>
</p>

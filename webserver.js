var server = exports;
var http = require('http');
var url = require('url');
var logger;

server.SETUP = function(log, port)
{
    logger = log;

    var createServerCallback = (async function(request, response)
    {
        var urlParts = url.parse(request.url, true);
        var urlParams = urlParts.query;
        var urlPath = urlParts.pathname;
        var body = [];
        
        body = Buffer.concat(body).toString();

        response.statusCode = 200;
        response.setHeader('Content-Type', 'application/json');
        response.setHeader('Access-Control-Allow-Origin', '*');

        if(urlPath == '/test')
        {
            response.write('Hello World');
            response.end();
        }

    }).bind(this);

    http.createServer(createServerCallback).listen(port, '0.0.0.0');
       
    logger.log('info', 'bridge', 'Bridge', 'Data Link Server läuft auf Port [' + port + ']');
};
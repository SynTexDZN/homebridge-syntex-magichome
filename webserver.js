var server = exports;
var http = require('http');
var url = require('url');
var logger, pages = [];

server.SETUP = function(prefix, log, port)
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

        for(var i = 0; i < pages.length; i++)
        {
            if(urlPath == pages[i].path)
            {
                if(request.method == 'POST')
                {
                    var post = '';

                    request.on('data', function(data)
                    {
                        post += data;
                    });

                    request.on('end', async function()
                    {
                        var json = post != '' ? JSON.parse(post) : null;
                        
                        pages[i].callback(response, urlParams, json);
                    });
                }
                else
                {
                    pages[i].callback(response, urlParams, null);
                }
            }
        }

    }).bind(this);

    http.createServer(createServerCallback).listen(port, '0.0.0.0');
       
    logger.log('info', 'bridge', 'Bridge', prefix + ' Server läuft auf Port [' + port + ']');
};

server.addPage = function(path, callback)
{
    pages.push({ path : path, callback : callback });
}
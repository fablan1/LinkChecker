/**
 * Created by fabian on 25.01.17.
 */

var csv = require("fast-csv");
var fs = require("fs");
var request = require('request');
var cheerio = require('cheerio');

var requestPause = 1000;
var requestsPerPause = 2; // How many requests will be sent per pause interval
//var path = "csvinput/my_old.csv";
var counter = {total:0,errors:0,success:0,fired:0};

//var linkToCheck = ".*apobank\.de.*";
var linkToCheck = "bogner.com";
var testdata = [];
var links = [];
var cancelCrawl = false;
var currentRequests= [];
var requestInterval = false;


var crawlURLs ={helper:{ }};

crawlURLs.crawlingProcess = function(path)
{
    cancelCrawl = false;
    console.log("Server got Path:",path);
    csv
        .fromPath(path)
        .on("data", function(data)
        {
            testdata.push(data);
        })
        .on("end", function()
        {
            if (cancelCrawl)
            {
                crawlURLs.helper.clearAll();
                return;
            }
            console.log(testdata);
            console.time('FireRequests');
            console.time('FireRequestsAndResponses');
            console.log('Total Urls in file:',testdata[0].length);
            crawlURLs.helper.checkBacklinks(testdata[0], function()
            {
                //console.log(links);
                process.stdout.write(' \r');
                console.log('------------------- All Requests Done -------------------');
                console.timeEnd('FireRequestsAndResponses');
                console.log('Success:',counter.success,'Errors',counter.errors,'Fired',counter.fired);
                crawlURLs.helper.createFinalCSV(links);
            });
        });
};


//Helper Functions
crawlURLs.helper.checkBacklinks = function (urls,allDoneCb)
{
    if (cancelCrawl)
    {
        crawlURLs.helper.clearAll();
        return;
    }

    var responseCounter = 0;
    var requestsFiredCounter = 0;
    var interval;

    var handleResponse = function (urlObject)
    {

        //console.log('handleResponse',responseCounter);
        links.push(urlObject);
        responseCounter++;
        if (urls.length == responseCounter)
        {
            allDoneCb(); // we are done
        }
    }

    var checkLinkBatch = function (start)
    {
        var end = start + requestsPerPause;
        if (end > urls.length)
        {
            end = urls.length;
        }
        if (urls.length == responseCounter)
        {
            return;
        }
        //console.log('start',start,'end',end);

        for (var i = start; i < end; i++)
        {

            var url = urls[i];
            crawlURLs.helper.checkBackLink(url,handleResponse);
            requestsFiredCounter++;
        }

        if (end == urls.length)
        {
            //console.log('all Fired');
            clearInterval(requestInterval);
            //console.timeEnd('FireRequests');
        }
    }

    requestInterval = setInterval(function ()
    {
        checkLinkBatch(requestsFiredCounter);
        //process.stdout.write('ResponseCounter: '+responseCounter+'/'+urls.length+' RequestsFiredCounter: '+requestsFiredCounter +'\r');
    },requestPause)

};

crawlURLs.helper.checkBackLink = function (url,cb)
{
    if (cancelCrawl)
    {
        crawlURLs.helper.clearAll();
        return;
    }
    counter.fired++;
    var currentRequest =  request(url,{timeout:7000}, function (error, response, body)
    {
        crawlURLs.helper.handleResponse(url,error, response, body,cb);
    })
    currentRequests.push(currentRequest);
};

crawlURLs.helper.handleResponse = function (url,error, response, body,cb)
{
    if (cancelCrawl)
    {
        crawlURLs.helper.clearAll();
        return;
    }

    counter.total++;
    var urlObject;
    process.stdout.write(counter.total+' url: '+url+' error: '+error + ' '+ cancelCrawl+' \r');
    //console.log(responseCount,'url',url,'error',error);
    if (!error)
    {
        if (response.statusCode == 200)
        {
            counter.success++;
            var allLinks = crawlURLs.helper.getAllLinks(url,body);
            urlObject = crawlURLs.helper.processLinks(url,allLinks);
        }
        else
        {
            counter.errors++;
            urlObject = crawlURLs.helper.trackStatusCode(response,cb);
        }
    }
    else
    {
        counter.errors++;
        urlObject = crawlURLs.helper.trackError(error,cb);
    }
    //console.log("URL Object",urlObject);
    cb(urlObject);
};


crawlURLs.helper.getAllLinks = function (requestUrl,body)
{
    $ = cheerio.load(body);
    var dataObject = {};
    var url = requestUrl.href;
    var links = [];

    $('a').each(function(i, elem)
    {
        links[i] = $(this).attr('href');
    });
    dataObject.linksOnPage =links;
    dataObject.URL = url;
    return dataObject;
};


crawlURLs.helper.processLinks = function (url,dataObject)
{
    //console.log('linksOnPage',dataObject.linksOnPage)
    for (var i = 0; i <= dataObject.linksOnPage.length; i++)
    {
        var link = dataObject.linksOnPage[i];
        //console.log(link);
        if (link)
        {
            var check = link.match(linkToCheck);
            if (check != null)
            {
                //console.log('matched link',link);
                return {URL:url, found:"yes"};
            }
        }
        if (cancelCrawl)
        {
            crawlURLs.helper.clearAll();
            return;
        }
        else
        {
            return {URL:url, found:"no"};
        }
    }

};

crawlURLs.helper.createFinalCSV = function (data)
{
    if (cancelCrawl){
        crawlURLs.helper.clearAll();
        return;
    }
    var csvStream = csv.createWriteStream({headers: true});
    var writableStream = fs.createWriteStream("csvoutput/output.csv");
    console.time('WriteCSVFile');
    writableStream.on("finish", function()
    {
        console.timeEnd('WriteCSVFile');
    });

    csvStream.pipe(writableStream);
    for (var z =0; z < data.length; z++)
    {
        csvStream.write({URL: data[z].URL, found: data[z].found});
    }
    //csvStream.write({URL: data[0].URL, found: data[0].found});
    //csvStream.write({a: data[0][0].URL, b: data[0][0].found});
    //csvStream.write({a: "a1", b: "b1"});
    csvStream.end();
    crawlURLs.helper.clearAll();
};

crawlURLs.helper.trackError = function (error,cb)
{
    var errorObject = {URL:error, found:"no"};
    return errorObject;
};

crawlURLs.helper.trackStatusCode = function (response,cb)
{
    var URL = response.request.uri.href;
    var statusCodeObject = {URL:URL, found:response.statusCode};
    return statusCodeObject;
};


crawlURLs.helper.cancel = function (){
    cancelCrawl = true;
};

crawlURLs.helper.clearAll = function ()
{
    counter = {total:0,errors:0,success:0,fired:0};
    testdata = [];
    links = [];

    for (var i = 0; i < currentRequests.length; i++)
    {
        currentRequests[i].abort();
    }
    currentRequests = [];
    clearInterval(requestInterval);
};

crawlURLs.helper.fileDownload = function ()
{
    var fs = require('fs');
    try { fs.writeFileSync('/Users/fabian/Downloads/blubblub', 'utf-8'); }
    catch(e) { alert('Failed to save the file !'); }
}


//crawlURLs.crawlingProcess(path);

module.exports = crawlURLs;





// Icon erstellen und ändern
// Input für Crawltime einbauen
// Input für Search String einbauen
// Fertig Datei zum DL oder Pfad anbieten
// Socket io um crawlign Prozess im Front End anzuzeigen
// Benachrichtigung wenn Crawl fertig ist
// Launch für WIN und MAC



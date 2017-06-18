/**
 * Created by fabian.langenau on 26.01.2017.
 */

// Some Global variables START

const holder = document.getElementById('holder');
const buttonCrawl = document.getElementById("crawl");
const buttonCrawlCancel = document.getElementById("cancel");
let crawlActive = 0;
let status = 0;
let filePath = "";

buttonCrawl.addEventListener("click", checkFileStatus );
buttonCrawlCancel.addEventListener("click", sendCancel );

// In renderer process (web page).
const {ipcRenderer} = require('electron')

// Some Global variables END


function sendData(filePath,searchString,crawlSpeed) {
    var dataObject ={filePath:filePath, stringToMatch:searchString, crawlSpeed:crawlSpeed};
    console.log(dataObject.filePath);
    ipcRenderer.send('asynchronous-message', dataObject)
}

/*
ipcRenderer.on('asynchronous-reply', (event, arg) => {
    console.log(arg) // prints "pong"
})*/

ipcRenderer.on('asynchronous-reply', (event, arg) =>
{

    if (arg.serverMessage == 'crawlStarted')
    {
        document.getElementsByClassName('cs-loader-inner')[0].style.display ='inline';
        console.log('Crawl started');
    }
    if (arg.serverMessage == 'totalURLs')
    {
        document.getElementById('currentURL').innerHTML = "0";
        document.getElementById('totalURLs').innerHTML = 'of '+arg.urlsInFile;
    }
    if (arg.serverMessage == 'crawlCancelled')
    {
        hideStatusElements();
        cancelCrawl();
    }
    if (arg.serverMessage == 'crawlFinish')
    {
        hideStatusElements();
        console.log(arg.crawlSummary);
    }
    if (arg.serverMessage =='counter')
    {
        //console.log('aktuelle URL',arg.counterNr);
        document.getElementById('currentURL').innerHTML = arg.counterNr;
    }
})

function sendCancel (){
    ipcRenderer.send('asynchronous-message', "cancel");
}



holder.ondragover = () => {
    return false;
}
holder.ondragleave = holder.ondragend = () => {
    console.log("Its draged now");
    return false;
}


holder.ondrop = (e) => {
    e.preventDefault()
    console.log(e);
    for (let f of e.dataTransfer.files) {

        filePath = f.path;
        console.log('File(s) you dragged here: ', f.path)
        console.log(status);
        console.log(filePath);
        if(filePath.match(/.csv/g))
        {
            console.log("file does include .csv");
            creatDoneIcon();
            status = 1;
        } else
        {
            console.log("File does not include .csv");
            createWrongIcon ( );
        }

    }
    return false;
}


function checkFileStatus( )
{
    if(status == 0){
        console.log("error: no File found, please drop file");
    }
    if (status == 1) {
        var searchString = document.getElementById('searchString').value;
        var crawlSpeed = document.getElementById('crawlSpeed').value;
        console.log(crawlSpeed);
        console.log(searchString);
        console.log("Dateipfad", filePath);
        buttonCrawl.className += " disabled";
        sendData(filePath,searchString,crawlSpeed);
    }
};

function cancelCrawl( )
{
    if(status == 0){
        console.log("Can not Cancel, crawl not running");
    }
    if (status == 1) {
        filePath = "";
        status = 0;
        buttonCrawl.className += "waves-effect waves-light btn";
        document.getElementsByClassName('cs-loader-inner')[0].style.display ='none';
        //sendCancel();
        removeDoneIcon();
    }
};


function creatDoneIcon ( )
{
    document.getElementById("notvalid").style.display ="none";
    document.getElementById("done").style.display ="inline";
}

function createWrongIcon ( )
{
    document.getElementById("done").style.display ="none";
    document.getElementById("notvalid").style.display ="inline";
}

function removeDoneIcon( )
{
    document.getElementById("done").style.display ="none";
}

function hideStatusElements() {
    document.getElementsByClassName('cs-loader-inner')[0].style.display ='none';
    document.getElementById('currentURL').innerHTML ='';
    document.getElementById('totalURLs').innerHTML ='';
}
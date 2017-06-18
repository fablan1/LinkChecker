const {app, BrowserWindow} = require('electron');
const path = require('path');
const url = require('url');
const {ipcMain} = require('electron');
const crawlURLs = require('./server.js');
const {dialog} = require('electron')
var fs = require('fs');



// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let win


function createWindow () {
    // Create the browser window.
    win = new BrowserWindow({width: 800, height: 600})


    // and load the index.html of the app.
    win.loadURL(url.format({
        pathname: path.join(__dirname, 'index.html'),
        protocol: 'file:',
        slashes: true
    }))

    // Open the DevTools.
    win.webContents.openDevTools()

    // Emitted when the window is closed.
    win.on('closed', () => {
        // Dereference the window object, usually you would store windows
        // in an array if your app supports multi windows, this is the time
        // when you should delete the corresponding element.
        win = null
})


}

ipcMain.on('asynchronous-message', (event, arg) => {

    var filePath = arg.filePath;
    var searchString = arg.stringToMatch;
    var crawlSpeed = arg.crawlSpeed;


    //console.log(arg);

    if(arg.filePath){
        console.log("Got DataObject from FrontEnd, success");
        crawlURLs.crawlingProcess(filePath,searchString,crawlSpeed);
        event.sender.send('asynchronous-reply', {serverMessage: 'crawlStarted'})
    }
    if(arg == 'cancel'){
        console.log("Front-End: stopp Crawling");
        crawlURLs.helper.cancel();
        event.sender.send('asynchronous-reply', {serverMessage: 'crawlCancelled'})
    }

    crawlURLs.noticeToMain = function(para) {

        //console.log(para.message);
        if (para.message == 'finished')
        {
            event.sender.send('asynchronous-reply', {serverMessage: 'crawlFinish', crawlSummary:""});
            dialog.showSaveDialog({}, function (filePath) {
                console.log(filePath)
                fs.writeFile(filePath, para.finalData, function (err) {
                    if(err) console.error(err);
                });
            });
            //event.sender.send('asynchronous-reply', {serverMessage: 'crawlFinish', crawlSummary:""})
        }
        if (para.message == 'currentURL')
        {
            event.sender.send('asynchronous-reply', {serverMessage: 'counter', counterNr:para.counter});
        }
        if (para.message == 'urlsInFile')
        {
            event.sender.send('asynchronous-reply', {serverMessage: 'totalURLs', urlsInFile:para.urlsInFile});
        }
    }


    /* DELETE NOT. NOT IN USE
    crawlURLs.sendURLCounter = function(para) {
        //console.log(para);
        event.sender.send('asynchronous-reply', {serverMessage: 'counter', counterNr:para});
    }*/
    //event.sender.send('asynchronous-reply', 'pong'); DELETE NOT. NOT IN USE

});

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', createWindow)

// Quit when all windows are closed.
app.on('window-all-closed', () => {
    // On macOS it is common for applications and their menu bar
    // to stay active until the user quits explicitly with Cmd + Q
    if (process.platform !== 'darwin') {
    app.quit()
}
})

app.on('activate', () => {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (win === null) {
    createWindow()
}
})









// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.


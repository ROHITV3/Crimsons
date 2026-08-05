/* 
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
/* global ble */

var referenceId;
var referenceType;
var lat = "0";
var lng = "0";
var eventId = 0;
var count = 0;
var RSSI = -70;

function bluetooth() {

    checkMainPage();

    function checkMainPage() {
        if (document.getElementsByClassName("ui-page ui-page-theme-a ui-page-header-fixed ui-page-footer-fixed ui-page-active")[0].id === "main") {
            checkBluetooth();
        }
        else {
            return "";
        }
    }

    function scan() {
        ble.startScanWithOptions([], {reportDuplicates: false}, function success(device) {
            //console.log("scanning");
            onDiscover(device)
        }, function failure() {
            onError()
        });
    }

    function onDiscover(device) { 
        var Locationid = [];
        var joblist = document.getElementsByClassName("job-preview-value-bluetooth");
            for (var a = 0; a < joblist.length; a++) {
                var jobname = joblist[a].previousSibling.previousElementSibling.childNodes["0"].nodeValue;
                if (jobname == "Beacons")
                {
                    joblist[a].previousSibling.previousElementSibling.childNodes["0"].parentElement.style.display = "none";
                }
                if (jobname == "Location") {
                    Locationid.push(joblist[a].parentNode.parentElement.innerText);
                }
                if (parseInt(device.rssi) > RSSI)
                {
                    if (device.id == joblist[a].innerText)
                    {
                        referenceType = 1;
                        referenceId = device.id;
                        eventId = 27; //event = rfidTagDetected
                        count++;
                        var location = ""
                        switch (referenceId) {
                            case joblist[a].innerText:
                                location = Locationid[a];
                                break;
                            default:
                                console.log("No device found");
                        }
                            
                        var nextSiblingElement = joblist[a].parentElement.getElementsByClassName('job-preview-bluetooth-status')["0"];
                      
                        nextSiblingElement.style.backgroundColor = 'green';
                        //joblist[a].parentNode.nextSibling.firstChild.style.backgroundColor = 'green';
                        navigator.notification.beep(1);
                        navigator.vibrate(500);
                        if (nextSiblingElement.style.backgroundColor == 'green'){
                            if (referenceId != undefined) {
                                sendLocation(lat, lng, location, eventId, referenceId, referenceType);
                            }
                        //{ // make sure it is really green
    //                        if (count < 2)// ensure only 1 click once                   
    //                        {
                                //window.clearInterval(bluetoothInterval);
//                            joblist[a].parentElement.parentNode.click();
                                var jobListParent = $(joblist[a]).parent().parent();
                                if ($(jobListParent).attr('name') != null && document.getElementsByClassName("ui-page ui-page-theme-a ui-page-header-fixed ui-page-footer-fixed ui-page-active")[0].id === "main") { //&& $(e.target).attr('class') != "job-value job-navigate"
                                    goForm($(jobListParent).attr('job_id'), $(jobListParent).attr('name'), $(jobListParent).attr('job_name'), $(jobListParent).attr('job_type_id'), $(jobListParent).attr('job_status'), true);
                                    stopBluetooth();
                                }
    //                        }
                        } else {
                            navigator.notification.alert("Please move nearer to job location.", function () {}, "Unable to start job", '✔');
                        }
                    }

                else if ((device.id == joblist[a].innerText) && (parseInt(device.rssi) > RSSI))
                {
                    joblist[a].parentNode.nextSibling.firstChild.style.backgroundColor = 'red';
                }
            }
        }
    };
    function onError() {
        console.log("scanning failed");
    }

    function checkBluetooth() {
        ble.enable(scan());
    }
    
}

function stopBluetooth() {
    //for calculation distance??  
    ble.stopScan(function success() {
        
    }, function failure() {
        console.log("stop scan fail");
    });
}
function checkBluetoothInterval(){

    if ($('#main .jobList li').children(".job-preview").find(".job-preview-bluetooth-status").hasClass("job-preview-bluetooth-status")) {
        bluetooth();
    }
}




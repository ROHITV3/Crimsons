// ✔
window.localStorage["version"] = "0.1.9"; //set app version number
// var network = "zonglipub"; //global variable that decides which databaseIP to connect to
var initialheight; //used to record initial screen height
var databaseIP = 'http://203.125.7.40/JobAssignmentACPS'; //global databaseIP variable
var lang; //global variable to store languageJson
var spinnerDelay = 50;
var appDirectory;
var uploadDirectory;
var $photoPreviewPointer;
var $picPointer;
var pictureSource;
var destinationType;
var jobInterval;
var gpsInterval;
var pendingJobsRetryInterval;
//var bluetoothInterval = null;
var refreshRate = 120000; //2minutes
var gpsRate = 60000; //1minutes
//var bluetoothRate = 3000;
var list; //store json of locally stored joblist
var uploadInterval; //used to store uploadQueue's settimeout function
var uploadFirstCall = 10000; //time delay before uploadQueue is first called
var uploadDelay = 30000; //time delay between jobs, 30,000 = 30 secs
var $sigdiv;
var $drawdiv;
var uploadCount = 0;
var logDirectory;
var wifiAttribute = 0;

function initializeCordova(success, failure) {
    var timer = window.setInterval(function () {
        if (window.device) {
            window.clearInterval(timer);
            success();
        }
        ;
    }, 100);
    window.setTimeout(function () { //failsafe
        if (!window.device) { //phonegap failed
            window.clearInterval(timer);
            failure();
        }
        ;
    }, 5000); //5 seconds
}
;
window.onload = function () {
    initializeCordova(function success() {
        console.log("Cordova Initializing Success");
        setup();
        //setupLocation();
    }, function failure() {
        console.log("Cordova Initalizing Failed");
    });

};

function setupLocation()
{
    spinInLocation();
    navigator.geolocation.getCurrentPosition(function success()
    {
        console.log("Location Initializing Success");
        spinOut();

    }, function error() {
        console.log("Location Initalizing Failed");
        spinOut();
        navigator.notification.alert("Please change your settings to enable location service."
                                        ,function(){},"Unable to Capture Location",'OK');
    },
    {timeout:15000});
}


function receiveErrorDevicePNRegistration() { // these are for push notification

}
function receiveSuccessfulDevicePNRegistration() {

}

function onPushNotification() { //Refresh job when there is new push notification sent
    loadJob("all");
}

function setup() {
    initialheight = $('body').height();
    document.addEventListener("backbutton", onBackKeyDown, false);

    var permissions = cordova.plugins.permissions;

    var permissionList = [
        permissions.CAMERA,
        permissions.ACCESS_COARSE_LOCATION,
        permissions.ACCESS_FINE_LOCATION,
        permissions.ACCESS_NETWORK_STATE,
        permissions.READ_EXTERNAL_STORAGE,
        permissions.WRITE_EXTERNAL_STORAGE
    ];

    permissions.checkPermission(permissionList, function (status)
    {
        if (status.hasPermission)
        {

        } else
        {
            permissions.requestPermissions(
                permissionList,
                function(status)
                {
                    if (!status.hasPermission)
                    {
                        alert('Please enable camera / location / storage permissions for application to work properly.')
                    }
                },
                function error()
                {
                   //  alert('Please enable camera / storage / location permissions for application to work properly.');
                }
            );
        }
    });

    window.onerror = function(message, file, line)
    {
      writeLogs("error from listener on " + file + " at " + line + ": " + message);
      //console.log("error from listener on " + file + " at " + line + ": " + message);
    }
    //registerDevice();
    if (localStorage.getItem("databaseIP") != null) {
        databaseIP = window.localStorage["databaseIP"]; //get databaseIP from localStorage
        $('#customer').html('<h4>' + localStorage.getItem("customer") + '</h4>'); //get customer's name from localstorage
        $("#registerDeviceBtn").val(localStorage.getItem("assetLabel")); //get device name from localstorage
        $("#unitId").val(localStorage.getItem("unitId")); //get unitId from localstorage
        $("#registerDeviceText").show();
    } else {
        $("#registerShell").show();
    }
    if (window.localStorage["language"] != null) {
        lang = JSON.parse(window.localStorage["languageJson"]);
        setLanguage();
    }
    else
    {
        changeLanguage("en")
    }

    $("#registerDeviceText").bind('click', function () {
        $("#registerDeviceText").toggle();
        $("#registerShell").toggle();
    })

    $("#registerDeviceBtn").bind('click', function ()
    {
        var firstRun = checkFirstRun();

        if (firstRun)
        {
            // do nothing
        }
        else
        {
            navigator.notification.alert('Internet connectivity is required for first registration.', function () {
                    }, 'Connection Required', 'OK');
            return;
        }

        $("#registerDeviceBtn").blur();
        cordova.plugins.barcodeScanner.scan(
                function (result) {
                    if (result.text.substring(0, 8) == "{ 'url':" || result.text == "") {
                        if (result.text != "") {
                            var newQR = JSON.parse(result.text.replace(/'/g, '"')); //replace '' with ""  { 'url': 'http://192.168.254.35:8080/V3nity/', 'customer': 'Tampines West Community Club', 'label': 'TWCC 1', 'unitId': '12345' }
                            window.localStorage["databaseIP"] = newQR.url; // localStorage - after log out, won't store data
                            databaseIP = window.localStorage["databaseIP"]; //get databaseIP from localStorage
                            window.localStorage["customer"] = newQR.customer;
                            $('#customer').html('<h4>' + localStorage.getItem("customer") + '</h4>');
                            window.localStorage["assetLabel"] = newQR.label;
                            $("#registerDeviceBtn").val(localStorage.getItem("assetLabel"));
                            window.localStorage["unitId"] = newQR.unitId;
                            console.lof( $("#unitId").val(localStorage.getItem("unitId")));
                            $("#unitId").val(localStorage.getItem("unitId")); //get unitId from localstorage
                            $("#registerDeviceText").toggle();
                            $("#registerShell").toggle();
                            changeLanguage("en");
                        }
                    } else {
                        navigator.notification.alert(lang.Mobile018, function () {
                        }, lang.Mobile017, 'OK');
                    }
                },
                function (error) {
                    navigator.notification.alert(lang.Mobile018, function () {
                    }, lang.Mobile019, 'OK');
                    console.log("barcodescan error: " + error);
                }
        );
    });

    //https://developer.mozilla.org/en-US/docs/Web/API/FileSystemDirectoryEntry/getDirectory for create and exclusive logic
    var folder = "ACPS";
    window.requestFileSystem(LocalFileSystem.PERSISTENT, 1, function (fileSys) {
        fileSys.root.getDirectory(folder, {create: true, exclusive: false}, function (directory) {
            appDirectory = directory;
            console.log("App directory initialized.");
            appDirectory.getDirectory("Upload", {create: true, exclusive: false}, function (directory) {
                uploadDirectory = directory;
                console.log("Upload directory initialized.");
            }, fail);

            appDirectory.getDirectory("Log", {create: true, exclusive: true}, function (directory) { //check if there is a log folder, if yes goto error handler, else create
                afterGetDirectory(directory);
            }, function getFile(error) {
                console.log("Log directory Error: " + error.code);
                appDirectory.getDirectory("Log", {create: false} , function(directory){
                    afterGetDirectory(directory);
                }, fail);
            });
        }, fail);
    }, fail);

    function fail(error) {
        console.log("App directory Error: " + error.code);
        if (error.code == 2) {
            alert("Permission for accessing Storage denied, kindly go to your setting and allow this permission. Do restart the App afterward. ");
            window.plugins.spinnerDialog.hide();
            window.plugins.spinnerDialog.show(null, "Storage, Location & Camera Permissions required for App to be fully functional. Kindly enable it at your Settings.", true);
        }
    }

    function afterGetDirectory(directory){
        logDirectory = directory;
        clearCache();
        createFile(); // create logFile
        deleteFile(); // delete logFile > 7 days.
        if (localStorage.getItem("loginUser") != null && localStorage.getItem("loginPassword") != null) {
            $("#loginUser").val(localStorage.getItem("loginUser")); //get loginUser from localstorage
            $("#loginPassword").val(localStorage.getItem("loginPassword")); //get loginPassword from localstorage
            $("#unitId").val(localStorage.getItem("unitId")); //get unitId from localstorage
            login();
        }
    }


    pictureSource = navigator.camera.PictureSourceType;
    destinationType = navigator.camera.DestinationType;

    $sigdiv = $("#signatureview");
    $drawdiv = $("#drawingview");

    if ($(window).height() > 749) {
        $drawdiv.jSignature({
            'lineWidth': 0,
            'width': 576,
            'height': 720,
            'background-color': 'transparent',
            'decor-color': 'transparent',
        });

        $drawdiv.css({"width": 576, "height": 720, "border": "1px solid black", "margin": "0 auto"});

        $sigdiv.jSignature({
            'lineWidth': 0,
            'width': 480,
            'height': 400,
            'background-color': 'transparent',
            'decor-color': 'transparent',
        });
        $sigdiv.css({"width": 480, "height": 400, "border": "1px solid black", "margin": "0 auto"});
    } else {
        $drawdiv.jSignature({
            'lineWidth': 0,
            'width': 280,
            'height': 350,
            'background-color': 'transparent',
            'decor-color': 'transparent',
        });

        $drawdiv.css({"width": 280, "height": 350, "border": "1px solid black", "margin": "0 auto"});

        $sigdiv.jSignature({
            'lineWidth': 0,
            'width': 300,
            'height': 250,
            'background-color': 'transparent',
            'decor-color': 'transparent',
        });

        $sigdiv.css({"width": 300, "height": 250, "border": "1px solid black", "margin": "0 auto"});

    }

    // This function doesn't work with older versions of android
    window.dispatchEvent(new Event('resize'));

    $('#signaturepopup .verifyBtn .verify0').bind('click', function () {
        $('#signaturepopup').hide();
        confirmSign(1);
    });
    $('#signaturepopup .verifyBtn .verify1').bind('click', function () {
        $('#signaturepopup').hide();
        confirmSign(2);
    });
    $('#signaturepopup .verifyBtn .verify0,#signaturepopup .verifyBtn .verify1').bind('vmousedown', function () {
        $(this).css('background-color', '#b2b2b2');
    }).bind('vmouseup', function () {
        $(this).css('background-color', '#f5f5f5');
    }).bind('vmousecancel', function () {
        $(this).css('background-color', '#f5f5f5');
    });

    $('#drawingpopup .verifyBtn .verify0').bind('click', function () {
        $('#drawingpopup').hide();
        confirmDraw(1);
    });
    $('#drawingpopup .verifyBtn .verify1').bind('click', function () {
        $('#drawingpopup').hide();
        confirmDraw(2);
    });
    $('#drawingpopup .verifyBtn .verify0,#drawingpopup .verifyBtn .verify1').bind('vmousedown', function () {
        $(this).css('background-color', '#b2b2b2');
    }).bind('vmouseup', function () {
        $(this).css('background-color', '#f5f5f5');
    }).bind('vmousecancel', function () {
        $(this).css('background-color', '#f5f5f5');
    });


    $('.navBtn').bind('vmousedown', function () { //opacity toggle feedback effect
        $(this).css('opacity', '0.7');
    }).bind('vmouseup', function () {
        $(this).css('opacity', '1.0');
    }).bind('vmousecancel', function () {
        $(this).css('opacity', '1.0');
    });

    $('#settingsBtn').bind('click', function () {

        var getlanguage_URL = databaseIP + "/Controller/mobile_controller.jsp?type=system&action=language";
        $.ajax({
            url: getlanguage_URL,
            type: 'GET',
            success: function (data) {
                if (data.result) {
                    $("#languageSelect").html("");
                    for (i = 0; i < data.data.length; i++) {
                        $("#languageSelect").append("<option value='" + data.data[i].code + "'>" + data.data[i].name + "</option>");
                    }
                    if (window.localStorage["language"] != null) {
                        $("#languageSelect").find('option[value="' + window.localStorage["language"] + '"]').attr("selected", true);
                    }
                    $("#languageSelect").change(function () {
                        changeLanguage($(this).val());
                    })
                    spinIn();
                    $.mobile.changePage("#settings", {transition: 'fade'});
                    spinOut();
                } else {
                    //
                }
            },
            error: function (error, errorText, errorThrown) {
                console.log("getLanguage error: " + error + " errorText: " + errorText + " errorThrown: " + errorThrown);
                spinOut();
            }
        })
    });
    $('#settings .backBtn').bind('click', function () {
        spinIn();
        //do something here to apply settings before going back
        setTimeout(function () {
            $.mobile.changePage("#index", {transition: 'fade', reverse: 'true'});
            spinOut();
        }, 500);
    });


    $('#noBtn').bind('click', function () {
        closeYesNoPopup();
        rebindMainJobList();
    });

    $('.logoutBtn').bind('click', function () {
        if (localStorage.getItem("uploadQueue") == "[]" || window.localStorage["uploadQueue"] == undefined) {
            $('#yesnoTitle').html(lang.Mobile024);
            $('#yesnoText').html(lang.Mobile025);
            $('#yesBtn').unbind('click');
            $('#yesBtn').bind('click', function () {
                closeYesNoPopup();
                confirmLogout(2);
            });
            $('#yesnopopup').show();
//            navigator.notification.confirm(
//                    lang.Mobile025,
//                    confirmLogout,
//                    lang.Mobile024,
//                    ["✘", "OK"]
//                    );
        } else {
            navigator.notification.alert(lang.Mobile027, function () {
            }, lang.Mobile026, 'OK');
        }
    });
    $('.adhocBtn').bind('click', function () {
        var driverid = window.sessionStorage["userID"];
        var formtemplate_URL = databaseIP + "/Controller/mobile_controller.jsp?type=job&action=downloadFormTemplates&driver=" + driverid;

        console.log('formtemplate_URL',formtemplate_URL)

        $.ajax({
            url: formtemplate_URL,
            type: 'GET',
            timeout: 30000,
            success: function (data) {
                if (data.result) {
                    var form_name = data.arrFormName.split(",");
                    var form_id = data.arrFormId.split(",");
                    var form_options = "";
                    for (i = 0; i < form_id.length; i++) {
                        form_options = form_options + "<option value='" + form_id[i] + "'>" + form_name[i] + "</option>";
                    }
                    confirmPopup(
                            "<div class='adhocForm'><label>" + lang.Mobile029 + "</label><select>" + form_options + "</select><br><br>" +
                            "<label>" + lang.Mobile030 + "</label><input type='number' value='10' placeholder='" + lang.Mobile031 + "' ><br><br>" +
                            "<label>" + lang.Mobile032 + "</label><textarea maxlength='100' rows='3' placeholder='" + lang.Mobile033 + "'></textarea></div>"
                            , confirmAdhoc, lang.Mobile028, ["CANCEL", "CREATE"]);
                } else {
                    console.log("adhoc_form_types fail: result returns fail.");
                }
            },
            error: function (error, errorText, errorThrown) {
                console.log("adhoc_form_types error: " + error.responseText + " errorText: " + errorText + " errorThrown: " + errorThrown);
                spinOut();
            }
        });
    });

    $('#main .refreshBtn').bind('click', function () {
        loadJob("all");
    });
    $('#form .saveBtn').bind('click', function () {
        console.log("=====> save button clicked" + window.sessionStorage["selected_id"])
        spinIn();
        writeLogs("form saveBtn clicked,  id = " + window.sessionStorage["selected_id"]);
        resetFormSaver();
        newSaveDividedForm(window.sessionStorage["selected_file"], false, false, '', false);
    });


    bindSubmitBtn();
    function bindSubmitBtn() {
        $('#form .submitBtn').on('touchstart', function (e) {
            $(this).off('touchstart');
                   // how to disable touchstartevent from firing twice
            $('#yesnoTitle').html(lang.Mobile112);
            $('#yesnoText').html(lang.Mobile111);
            $('#yesBtn').unbind('click');
            $('#yesBtn').bind('click', function () {
                closeYesNoPopup();
                confirmSubmit(2);
            });
            $('#yesnopopup').show();

//            navigator.notification.confirm(
//                    lang.Mobile111,
//                    confirmSubmit,
//                    lang.Mobile112,
//                    ["✘", "OK"]
//                    );
            setTimeout(function() { bindSubmitBtn(); }, 1000);
        });
    }
    bindBackBtn();
    function bindBackBtn() {
        $('#form .backBtn').on('touchstart', function () {
            $(this).off('touchstart');

            $('#yesnoTitle').html(lang.Mobile077);
            $('#yesnoText').html(lang.Mobile078);
            $('#yesBtn').unbind('click');
            $('#yesBtn').bind('click', function () {
                closeYesNoPopup();
                confirmBackForm(2);
            });
            $('#yesnopopup').show();

//            navigator.notification.confirm(
//                    lang.Mobile078,
//                    confirmBackForm,
//                    lang.Mobile077,
//                    ["✘", "OK"]
//                    );
            setTimeout(function() { bindBackBtn(); }, 1000);
        });
    }

    $(".queuelistBtn").bind("click", function () { //yyy
        navigator.notification.alert("Please note that you are entering the queue list that is used for bug fixing. If you encounter any issues, remember to screenshot it and send it to us.", function () {
            $.mobile.changePage("#queue", {transition: 'flip'});
            initQueueList();
        }, "Enter Queue List", 'OK');
    });

    document.addEventListener("online", checkLanguage, false);

    if (window.localStorage["sort"] == null)
    {
        window.localStorage["sort"] = "auto"; //get databaseIP from localStorage
        window.localStorage["tempsortchoice"] = 'auto';
    }

    $('#sortBtn').bind("click", function()
    {

        var networkState = navigator.connection.type;
        if (networkState === Connection.NONE)
        {
            navigator.notification.alert('This function is only available when you are connected to the internet.', function () {
                }, 'Unable to Change Sort Preference', 'OK');
            return;
        }

        var htmlToUse = '';

        if (window.localStorage["sort"] == "auto")
        {
            htmlToUse = "<div class='sort-select selected-sort' id='sort-auto' onclick='changeSortPref(\"auto\")'>Auto</div>";
            htmlToUse += "<div class='sort-select' id='sort-manual' onclick='changeSortPref(\"manual\")'>Manual</div>";
        }
        else
        {
            htmlToUse = "<div class='sort-select' id='sort-auto' onclick='changeSortPref(\"auto\")'>Auto</div>";
            htmlToUse += "<div class='sort-select selected-sort' id='sort-manual' onclick='changeSortPref(\"manual\")'>Manual</div>";
        }

        confirmPopup(htmlToUse, confirmSort, "Sort Preference", ["CANCEL", "OK"]);
    });

//    downloader.init({folder: "ACPS", unzip: true});
}


function confirmSort(response) {
    if (response == 2)
    {
        window.localStorage["sort"] = window.localStorage["tempsortchoice"];

        if (window.localStorage["sort"] == 'auto')
        {
//            localStorage.setItem("sortsequence", JSON.stringify(jobIdSeq));
        }

        loadJob("all");
    }
}

function changeSortPref(sortPref)
{
    if (sortPref == 'auto')
    {
        $('#sort-manual').removeClass('selected-sort');
        $('#sort-auto').addClass('selected-sort');
        window.localStorage["tempsortchoice"] = 'auto';
    }
    else
    {
        $('#sort-manual').addClass('selected-sort');
        $('#sort-auto').removeClass('selected-sort');
        window.localStorage["tempsortchoice"] = 'manual';
    }
}

function downloadFileFromUrl(downloadUrl, appRefNo)
{
    var fileTransfer = new FileTransfer();
    //var uri = encodeURI(downloadUrl + '&refNo=' + appRefNo);

  //  var uri = downloadUrl+ '&refNo=' + appRefNo ;
//    var uri = "http://203.125.7.46:8080/ACPS/PPR2019093005285.zip";
//    var uri = "https://test.construct.ttbizlink.gov.tt/ttacps_webservice/api/inspection/getApplicationFiles?refNo=PPR2019093005285&auth=";
  //  var uri = encodeURI("https://v3nity.com/V3Nity/UploadedImgs/PPR2019093005285.zip");
//    var uri = encodeURI("https://www.test.construct.ttbizlink.gov.tt/JobAssignmentACPS/img/regional_legend.png");
//    var uri = encodeURI("https://www.xpressflower.com/images/default-source/flowers/bouquets/bq1909-light-my-fire77435ba9350a62b6a920ff0000e4902b.jpg");
   // downloadUrl = "https://www.dropbox.com/s/svalmuhrhspn2f1/V3NITY_IMG%5B2023-07-25%20121332%5D.ZIP?dl=0";
   // var uri = "https://www.test.developtt.gov.tt/ttacps_webservice/api/inspection/getApplicationFiles?refNo=PPR2023072452722&auth=basic";
   // var uri = "https://www.test.developtt.gov.tt/ttacps_webservice/api/inspection/getApplicationFiles?refNo=PPR2020051911435&auth=basic";
    //  https://test.developtt.gov.tt/ttacps_webservice/api/inspection/getApplicationFiles?refNo=PPR2020051911435&auth=basic
    // above is the sample url working given by Crimson team
    console.log("App ref no:",appRefNo);
    var originalURL = downloadUrl;
    var uri = convertURL(originalURL,appRefNo)
    console.log('final URL: ' + uri + '&refNo=' + appRefNo)

    console.log('uri: ' + uri);

    fileTransfer.download(
    uri,
    cordova.file.externalRootDirectory + 'ACPS/' + appRefNo + '.zip',
//    cordova.file.externalRootDirectory + 'ACPS/regional_legend.zip',
    function(entry)
    {
        spinOut();
        console.log("download complete: " + entry.toURL());
        //alert(entry.toURL());
        navigator.notification.alert('Application files downloaded. You can find them inside the ACPS folder in your device.', function () {
                    }, 'Success', 'OK');
    },
    function(error)
    {
        spinOut();
        console.log('download error source ' + error.source + '\n' +
               'download error target ' + error.target + '\n' +
               'download error code ' + error.code + '\n');
        navigator.notification.alert('Unable to download application files.', function () {
                    }, 'Error', 'OK');
    },
    false,
    {
    });
}

function getApplicationDownloadUrl(appRefNo)
{
    spinIn();
    var user = window.localStorage['loginUser'];
    var password = window.localStorage['loginPassword'];
    var getDownloadLinkURL = databaseIP + "/Controller/mobile_controller.jsp?type=job&action=getapplicationfiles"
                    + "&username=" + encodeURIComponent(user) + "&password=" + encodeURIComponent(password);
   // getDownloadLinkURL = "https://www.dropbox.com/s/svalmuhrhspn2f1/V3NITY_IMG%5B2023-07-25%20121332%5D.ZIP?dl=0"
    console.log('getDownloadLinkURL', getDownloadLinkURL);

    $.ajax({
        url: getDownloadLinkURL,
        type: 'GET',
        timeout: 15000,
        success: function (data)
        {
            if (data.result)
            {
                console.log('Download URL:',JSON.stringify(data));
                console.log(JSON.stringify(data))
               downloadFileFromUrl(data.data, appRefNo);

                // downloadFileFromUrl()

            }
            else
            {
                spinOut();
                navigator.notification.alert('Unable to get download URL', function () {
                    }, 'Error', 'OK');
            }
        },
        error: function (error, errorText, errorThrown) {
            spinOut();
            navigator.notification.alert(lang.Mobile068, function () {
                }, 'Unable to Download', 'OK');
        }
    });
}




function checkLanguage()
{
    if (lang)
    {
        // do nothing
    }
    else
    {
        changeLanguage("en");
    }
}


function checkFirstRun() {
    // check if language data had been initiated, because otherwise will cause error

    if (lang)
    {
        return true;
    }
    else
    {  // TODO change to return false below , this has been changed for SDK 30 to work
        return false;
    }
}

function closeYesNoPopup()
{
    $('#yesnopopup').hide();
}

function clearCache() { // clear cacher folder that store photo image from camaera, the camera plugin will auto store in local cache for android
    var cacheDir ="";
    window.resolveLocalFileSystemURL(cordova.file.externalCacheDirectory, function(dir) {
        cacheDir = dir;
        var directoryReader = dir.createReader();
        directoryReader.readEntries(readAllFilesSuccess, readAllFilesFail);
    }, errorCallback);

    function readAllFilesFail(error) {
        console.log("Failed to list directory contents: " + error.code);
    }
    function readAllFilesSuccess(entries) {
        for (var i = 0; i < entries.length; i++) {
            cacheDir.getFile(entries[i].name, {create: false}, function(fileEntry) {
                fileEntry.remove(function() {
                    console.log('File removed.');
                }, errorCallback1);
            },errorCallback2);
        }
    }
    function errorCallback(error) {
          console.log("ERROR with getting directory path : " + error.code);
    }
    function errorCallback1(error) {
          console.log("ERROR with removing file: " + error.code);
    }
    function errorCallback2(error) {
          console.log("ERROR with getting file  : " + error.code);
    }
}

function createFile() {
  var now = getCurrentDateTime(5);
   var logFileName = now + "log.txt"

    logDirectory.getFile(logFileName, {create: true, exclusive: true}, function(fileEntry) {
        //alert('File creation successfull!');
        console.log("Log File creation successfully");
    }, errorCallback);

   function errorCallback(error) {
      console.log("Log Creation Error, code 12 = File Path Exist, code = " + error.code)
   }
}

function writeLogs(logText) {
    var now = getCurrentDateTime(5);
    var logFileToday = now + "log.txt"

    // need to check if it is today log
    logText = logText + " Time " + new Date();
//    console.log(logText);
    if (typeof logDirectory == 'undefined') {
        return false;
    }
    logDirectory.getFile(logFileToday, {create: false}, function(fileEntry) {
            writeContent(fileEntry);
    }, function failToGetTodayLogFile() { // if cant get today logFile, then it will create and write into it
        logDirectory.getFile(logFileToday, {create: true, exclusive: true}, function(fileEntry) {
            writeContent(fileEntry);
        }, errorCallback1);
    });

    function writeContent(fileEntry){ // if there are multiple entries in the same seconds, it might overwrite same line of logs.
        // Create a FileWriter object for our FileEntry (log.txt).
        fileEntry.createWriter(function(fileWriter) {
            fileWriter.seek(fileWriter.length); // Start write position at EOF.
          // Create a new Blob and write it to log.txt.
            fileWriter.write(new Blob([logText + '\n'], {type: 'text/plain'}));
            //console.log("write to log file successfully " + logFileToday + "Content : " + logText);
        }, errorCallback);
    }

    function errorCallback(error) {
      console.log("errorWritingLog + " + error.code + error.message);
    }
    function errorCallback1(error) {
      console.log("error Getting Log File + " + error.code + error.message);
    }
}

function deleteFile(){ // this is to delete the log file > 7 days.
    console.log("deletingFile");
    var lastWeekDate = new Date();
    lastWeekDate.setDate(lastWeekDate.getDate()-8);

    var directoryReader = logDirectory.createReader();
    directoryReader.readEntries(readAllFilesSuccess, readAllFilesFail);

    function readAllFilesFail(error) {
        alert("Failed to list directory contents: " + error.code);
    }
    function readAllFilesSuccess(entries) {
        if (entries.length < 7) {
            console.log("Nothing to Delete, Log Files are kept for 7 days");
        } else
        {
            for (var i = 0; i < entries.length; i++) {
                entries[i].file(function (file) {

                    var fileDateText = file.name.substring(0,8).split("-");
                    var fileDate = new Date("20" + fileDateText[2], fileDateText[1]-1, fileDateText[0]);
                    //console.log("file.name " + file.name.substring(0,8) + " " + fileDate);

                    if (lastWeekDate.getTime() >  fileDate.getTime()) {
                        logDirectory.getFile(file.name, {create: false}, function(fileEntry) {
                            console.log("removing file name "+ file.name);
                            fileEntry.remove(function() {
                                console.log('File removed.');
                            }, errorCallback);
                        },errorCallback1);
                    }
                });
            }
        }
    }
    function errorCallback(error) {
        console.log("ERROR with removing file: " + error.code)
    }
    function errorCallback1(error) {
        console.log("ERROR with finding file : " + error.code)
    }
}

$(function () {
    $('#confirmPopup').popup();
});


function onBackKeyDown() {

}

function onResize() {
    if ($('body').height() < initialheight) { //keyboard up
        $('#settingsBtn').hide();
        $('#customer').hide();
        $('#version').hide();
//        $('[data-role=header]').hide();
//        $('[data-role=footer]').hide();
    } else { //keyboard hidden
        $('#settingsBtn').show();
        $('#customer').show();
        $('#version').show();
//        $('[data-role=header]').show();
//        $('[data-role=footer]').show();
    }
}

function confirmLogout(response) {
    if (response == 2) { //if OK
        logout();
    } //else do nothing
}

function confirmExit(response) {
    if (response == 2) { //if OK
        spinIn();
        window.clearInterval(jobInterval);
        window.clearInterval(gpsInterval);
        window.clearInterval(pendingJobsRetryInterval);
//        stopBluetooth();
        window.clearTimeout(uploadInterval);
        navigator.app.exitApp();
        spinOut();
    } //else do nothing
}

function confirmAdhoc(response) {
    if (response == 2) { //if OK
        var user_id = window.sessionStorage["userID"];
        var templateid = $('#confirmPopup select').val();
        var duration = $('#confirmPopup input[type="number"]').val();
        var location = $('#confirmPopup textarea').val();
        if (templateid != null && duration != null && location != null) {
            spinIn();
            var JSONText = {};
            JSONText.driver = parseInt(user_id);
            JSONText.templateid = parseInt(templateid);
            JSONText.duration = parseInt(duration);
            JSONText.location = location;
            JSONText = JSON.stringify(JSONText);
            console.log("createAdhoc_json: " + JSONText);
            var createAdhoc_URL = databaseIP + "/Controller/mobile_controller.jsp?type=job&action=adhoc";
            console.log(createAdhoc_URL);
            $.ajax({
                type: 'POST',
                url: createAdhoc_URL,
                data: JSONText,
                contentType: "application/json",
                dataType: "json",
                cache: false,
                timeout: 30000,
                success: function (data) {
                    if (data.result) {
                        spinOut();
                        navigator.notification.alert(lang.Mobile035, function () {
                        }, lang.Mobile034, 'OK');
//                        loadJob("all");
                        loadJob("new");
                    } else {
                        spinOut();
                        console.log("createAdhoc failed: " + data.text);
                        if (data.text == "No report found in system with this form.") {
                            navigator.notification.alert(data.text, function () {
                            }, lang.Mobile036, 'OK');
                        } else {
                            navigator.notification.alert(lang.Mobile037, function () {
                            }, lang.Mobile036, 'OK');
                        }
                    }
                },
                error: function (error, errorText, errorThrown) {
                    spinOut();
                    console.log("createAdhoc error: " + error.responseText + " errorText: " + errorText + " errorThrown: " + errorThrown);
                    navigator.notification.alert(lang.Mobile009, function () {
                    }, lang.Mobile036, 'OK');
                }
            });
        } else {
            navigator.notification.alert(lang.Mobile038, function () {
            }, lang.Mobile036, 'OK');
        }
    } //else do nothing
}

function confirmPopup(confirmtext, func, confirmtitle, confirmbtns) {
    $('#confirmPopup .confirmTitle').html(confirmtitle);
    $('#confirmPopup .confirmText').html(confirmtext);
    $('#confirmPopup .confirmBtn').html("");

    for (i = 0; i < confirmbtns.length; i++) {
        $('#confirmPopup .confirmBtn').append('<div class="confirm' + i + '">' + confirmbtns[i] + '</div>');
        $('#confirmPopup .confirmBtn .confirm' + i).bind('click', function () {
            $('#confirmPopup').popup('close');
            func(parseInt($(this).attr('class').slice(-1)) + 1);
        }).bind('vmousedown', function () {
            $(this).css('background-color', '#b2b2b2');
        }).bind('vmouseup', function () {
            $(this).css('background-color', '');
        }).bind('vmousecancel', function () {
            $(this).css('background-color', '');
        });
        ;
    }

    $('#confirmPopup').popup();
    $('#confirmPopup').popup("open");
    $('#confirmPopup').on({//prevents background from scrolling when popup is up
        popupbeforeposition: function () {
            $('body').on('touchmove', false); // look like this is not really working, tried on adhoc button it still manage to scroll;
        },
        popupafterclose: function () {
            $('body').off('touchmove');
        }
    });
}


function confirmPopupImages(confirmtext, func, confirmtitle, confirmbtns) { // carter for only camera and gallery popup
    console.log('Confirm pop up');
    $('#confirmPopupImages .confirmTitle').html(confirmtitle);
    $('#confirmPopupImages .confirmText').html(confirmtext);
    $('#confirmPopupImages .confirmBtn').html("");

    for (i = 0; i < confirmbtns.length; i++) {
        $('#confirmPopupImages .confirmBtn').append('<div class="confirm' + i + '">' + confirmbtns[i] + '</div>');
        $('#confirmPopupImages .confirmBtn .confirm' + i).bind('click', function () {
            $('#confirmPopupImages').popup('close');
            func(parseInt($(this).attr('class').slice(-1)) + 1);
        }).bind('vmousedown', function () {
            $(this).css('background-color', '#b2b2b2');
        }).bind('vmouseup', function () {
            $(this).css('background-color', '');
        }).bind('vmousecancel', function () {
            $(this).css('background-color', '');
        });
        ;
    }

    $('#confirmPopupImages').popup();
    $('#confirmPopupImages').popup("open");
    $('#confirmPopupImages').on({//prevents background from scrolling when popup is up
        popupbeforeposition: function () {
            $('body').on('touchmove', false);
            $('#confirmPopupImages').css('display', 'block');
        },
        popupafterclose: function () {
            $('body').off('touchmove');
            $('#confirmPopupImages').css('display', 'none');
        }
    });
}

function spinIn() {
    window.plugins.spinnerDialog.show(null, null, true);
}

function spinInPhoto(){
    window.plugins.spinnerDialog.show(null, "Processing Photo..", true);
}

function spinInLocation(){
    window.plugins.spinnerDialog.show(null, "Accessing location..", true);
}

function spinOut() {
    setTimeout(function () {
        window.plugins.spinnerDialog.hide();
    }, spinnerDelay);
}

function changeLanguage(langcode) { // take live server's ip
    if (databaseIP == null)
    {
        return;
    }

    spinIn();
    console.log("Setting language to " + langcode);
    var language_url = databaseIP + "/Controller/mobile_controller.jsp?type=system&action=language&code=" + langcode;
    $.ajax({
        url: language_url,
        type: 'GET',
        timeout: 30000,
        success: function (data) {
            if (data.result) {
                window.localStorage["language"] = langcode;
                window.localStorage["languageJson"] = JSON.stringify(data.data);
                lang = JSON.parse(window.localStorage["languageJson"]);
                setLanguage();
                spinOut();
            } else {
                $("#languageSelect").find('option[value="' + window.localStorage["language"] + '"]').attr("selected", true);
                spinOut();
            }
        },
        error: function (error, errorText, errorThrown) {
            console.log("getLanguage error: " + error.responseText + " errorText: " + errorText + " errorThrown: " + errorThrown);
            spinOut();
        }
    })
}

function setLanguage() {
    /** Words in HTML **/
    $('#version').html('<h5> DEV ' + localStorage.getItem("version") + '</h5>');
    $("#signaturepopup .verifyTitle").html(lang.Mobile001);
    $("#signaturepopup .verifyText span").html(lang.Mobile002);
    $("#index .loginLogoText").html(lang.Mobile003);
    $("#loginUser").attr("placeholder", lang.Mobile004);
    $("#loginPassword").attr("placeholder", lang.Mobile005);
    $("#registerDeviceBtn").attr("placeholder", lang.Mobile015);
    $("#registerDeviceText").html(lang.Mobile016);
    $("#index .loginBtn").attr("value", lang.Mobile021)
    $("#settings [data-role=header] h1").html(lang.Mobile106);
    $("#languageHeader").html(lang.Mobile107);
    $("#main .lastUpdate").html(lang.Mobile023 + " <span>-</span>")
}

function login() {

    var firstRun = checkFirstRun();

    if (firstRun)
    {
        // do nothing
    }
    else
    {
        navigator.notification.alert('Internet connectivity is required for first login.', function () {
                }, 'Connection Required', 'OK');
        return;
    }

    var user = $('#loginUser').val(), password = $('#loginPassword').val(), unitid = $('#unitId').val();
    unitid = 'sst1';
    var deviceID = localStorage.getItem("deviceID");
    var deviceType = localStorage.getItem("deviceType");

      console.log('unitidd test', localStorage.getItem("unitId"));

      console.log('unitidd', unitid);

    if (databaseIP.indexOf("http://www.v3nity.com:80/V3Nity3/") >= 0 || databaseIP.indexOf("http://www.v3nity.com/V3Nity3/") >= 0) // shifting everyone to V4 webservice
    {
        databaseIP = databaseIP.replace("V3Nity3", "V3Nity4");
        window.localStorage["databaseIP"] = databaseIP;
    }

    if (databaseIP != "" && databaseIP != undefined) {
        console.log('databaseIP', databaseIP);
        if (user.length != 0 && password.length != 0 && unitid.length != 0) { //if user & password & unitid fields are not empty
            spinIn();
            console.log(">> Logging In " + user + " To " + databaseIP + "...");
            var loginURL = databaseIP + "/Controller/mobile_controller.jsp?type=system&action=login&username=" + encodeURIComponent(user) + "&password=" + encodeURIComponent(password) + "&unitId=" + encodeURIComponent(unitid)
                                + "&deviceId=" + encodeURIComponent(deviceID) + "&deviceType=" + encodeURIComponent(deviceType);

            // var loginURL = databaseIP + "/Controller/mobile_controller.jsp?type=system&action=login&username=" + encodeURIComponent(user) + "&password=" + encodeURIComponent(password) + "&unitId=" + encodeURIComponent(unitid)
              //                              + "&deviceId=" + "cWmIzFm6SZGE-N4YQvXxjV%3AAPA91bFsADsPamPPUzt6OP9XPQWGsxpkAHd6zEi_I3-usQBY82PsR4jIISGkCfyNdSuCxdNc_QRq_pG5kNOvEk" + "&deviceType=" + "1";



            console.log('loginUrl', loginURL);

            $.ajax({
                url: loginURL,
                type: 'GET',
                timeout: 15000,
                success: function (data) {
                    console.log('Data is:',JSON.stringify(data));
                    if (data.result) {
                        console.log(">> Log In Success...");
                        window.localStorage['loginUser'] = user;
                        window.localStorage['loginPassword'] = password;
                        window.localStorage['unitId'] = unitid;

                        window.sessionStorage["userID"] = data.data.id;
                        window.sessionStorage["username"] = data.data.username;
                        window.sessionStorage["driver"] = data.data.driver;
                        window.sessionStorage["assetId"] = data.data.assetId;
                        //console.log("Text=" + data.text + ", User=" + data.data.username + ", ID=" + data.data.id + ", Driver=" + data.data.driver + ", AssetId=" + data.data.assetId);
                        writeLogs("\n Text=" + data.text + ", User=" + data.data.username + ", ID=" + data.data.id + ", Driver=" + data.data.driver + ", AssetId=" + data.data.assetId);
                        $("#unitId").hide();

                        if(data.data.gpsRefreshRate != undefined && data.data.gpsRefreshRate > 0){ // customer attributes GPSRefreshRate=60000s
                            gpsRate = data.data.gpsRefreshRate;
                            cordova.plugins.backgroundMode.enable();
                            cordova.plugins.backgroundMode.on('activate', function() {
                                cordova.plugins.backgroundMode.disableWebViewOptimizations();
                            });
                        } else {
                            gpsRate = 60000; // reset back to original
                        }
                        if (appDirectory != undefined && uploadDirectory != undefined) {
                            setTimeout(function () {
                                loadJob("all");
                                getUserLocation();
                                jobInterval = window.setInterval(function () {
                                    loadJob("all");
                                }, refreshRate);
                                gpsInterval = window.setInterval(function () {
                                    getUserLocation();
                                }, gpsRate);
                                pendingJobsRetryInterval = window.setInterval(function () {
                                    sendPendingStatusUpdates();
                                }, 10000);
                                console.log("X7");
                                if (localStorage.getItem("uploadQueue") != "[]" && localStorage.getItem("uploadQueue") != null) { //if there is files in the uploadQueue
                                    writeLogs("Login, Initiate Job Queue, Jobs in Upload Queue : " + localStorage.getItem("uploadQueue"));
                                    uploadInterval = setTimeout(function () {
                                        newUploadQueue();
                                    }, uploadFirstCall);
                                }
                            }, 1000);
                        } else {
                            setTimeout(function () {
                                loadJob("all");
                                getUserLocation();
                                jobInterval = window.setInterval(function () {
                                    loadJob("all");
                                }, refreshRate);
                                gpsInterval = window.setInterval(function () {
                                    getUserLocation();
                                }, gpsRate);
                                pendingJobsRetryInterval = window.setInterval(function () {
                                    sendPendingStatusUpdates();
                                }, 10000);
                                console.log("X8");
                                if (localStorage.getItem("uploadQueue") != "[]" && localStorage.getItem("uploadQueue") != null) { //if there is files in the uploadQueue
                                    uploadInterval = setTimeout(function () {
                                        newUploadQueue();
                                    }, uploadFirstCall);
                                }
                            }, 400);
                        }
                        $.mobile.changePage("#main", {transition: "fade"});
                        spinOut();
                    } else {
                        navigator.notification.alert(lang.Mobile007, function () {
                        }, lang.Mobile006, 'OK');
                        $("#loginPassword").val(''); // clear loginPassword field
                        $('#loginPassword').focus();
                        spinOut();
                    }
                    if(data.data.wifiAttribute != undefined){ // Customer attributes MobileWifi=1
                        if (data.data.wifiAttribute == 1) {
                            cordova.plugins.backgroundMode.enable();
                            cordova.plugins.backgroundMode.on('activate', function() {
                                cordova.plugins.backgroundMode.disableWebViewOptimizations();
                            });
                            wifiAttribute = 1;
                        } else {
                            wifiAttribute = 0;
                        }
                    } else {
                        wifiAttribute = 0;
                    }
                },
                error: function (error, errorText, errorThrown) {
                    console.log("Error: " + error.responseText + " errorText: " + errorText + " errorThrown: " + errorThrown);
                    /*
                     * This behavior below is removed for ACPS.

                    localStorage.removeItem('loginUser'); //remove loginUser from localStorage
                    localStorage.removeItem('loginPassword'); //remove loginPassword from localStorage
                    $("#loginUser").val(''); //clear loginUser field
/                   $("#loginPassword").val(''); // clear loginPassword field

                    */
                    navigator.notification.alert(lang.Mobile009, function () {
                    }, lang.Mobile008, 'OK');
                    spinOut();
                }
            });
        } else {
            if (user.length == 0) {
                navigator.notification.alert(lang.Mobile011, function () {
                }, lang.Mobile010, 'OK');
            } else if (password.length == 0) {
                navigator.notification.alert(lang.Mobile012, function () {
                }, lang.Mobile010, 'OK');
            }
            else if (unitid.length == 0) {
               navigator.notification.alert('Please enter your unit ID.', function () {
               }, lang.Mobile010, 'OK');
           }
        }
    } else {
        navigator.notification.alert(lang.Mobile014, function () {
        }, lang.Mobile013, 'OK');
    }
}

function logout() {
    spinIn();

    // this to cater for offline data
    $('#main .jobList ul').html('');
    $('#main .jobCount span').html('0');
    jobsLoaded = 0;
    allJob = [];
    // this to cater for offline data

    window.clearInterval(jobInterval);
    window.clearInterval(gpsInterval);
//    window.clearInterval(bluetoothInterval);
//    stopBluetooth();
    clearTimeout(uploadInterval);
    sessionStorage.clear(); //clear sessionStorage data
    localStorage.removeItem('loginUser'); //remove loginUser from localStorage
    localStorage.removeItem('loginPassword'); //remove loginPassword from localStorage
    $("#loginUser").val(''); //clear loginUser field
    $("#loginPassword").val(''); // clear loginPassword field
    setTimeout(function () {
        $.mobile.changePage("#index", {transition: 'fade', reverse: 'true'});
        spinOut();
    }, 500);
}

function getUserLocation() {
    var referenceId = 0;
    var referenceType = 0;
    var networksArray = [];
    var options = {};

    if (wifiAttribute == 1) {
        WifiWizard.isWifiEnabled(function(){ //depend weather this is needed, but it is working now.
            WifiWizard.setWifiEnabled(true, function() {
                //console.log("Successfully enabled wifi in this device");
            }, function() {
                //console.log("Failed to Enable Wifi in this device");
            });
        }, function() {
            //console.log("Wifi Disabled");
        });
        WifiWizard.startScan(function(){console.log("success");}, function(){});  // seem like sometime it will get cached response instead.
        // https://developer.android.com/about/versions/oreo/background-location-limits

        WifiWizard.getScanResults(options, function (networks) { //add block and level attribute based on wifi
           networks.sort(sort_by('level', {})); // sort according to signal strength.
           for(var i = networks.length - 3; i < networks.length; i ++) {
               if (i < 0){
                   getCurrentLocation(); // if no wifi then go directly to get GPS
                   return false;
               }
               networksArray.push([networks[i]['BSSID'], networks[i]['level'], networks[i]['SSID']]);
           }
            // only return value when the wifi details are already in our database. ** SSID1 is the strongest signal strength with lowest negative rate.
            var returnwifi_url = databaseIP + "/Controller/mobile_controller.jsp?type=hotspot&action=get&ssid1=" + encodeURIComponent(networksArray[2][0]) + "&ssid2=" + encodeURIComponent(networksArray[1][0]) +"&ssid3=" + encodeURIComponent(networksArray[0][0])
                    + "&quality1=" + encodeURIComponent(networksArray[2][1]) + "&quality2=" + encodeURIComponent(networksArray[1][1]) +"&quality3=" + encodeURIComponent(networksArray[0][1]) + "&mode=0&name1="+ encodeURIComponent(networksArray[2][2])  + "&name2=" + encodeURIComponent(networksArray[1][2]) +"&name3=" + encodeURIComponent(networksArray[0][2]);

            writeLogs(networksArray[2][0] + " q: " + networksArray[2][1] + " 2 " + networksArray[1][0] +  " q: " + networksArray[1][1] + " 3: " + networksArray[0][0] + " q: " + networksArray[0][1]);

            $.ajax({
                url: returnwifi_url,
                type: 'GET',
                success: function (data) {
                    if (data.result) {
                        if(data.data !== undefined){
                            //alert("nearby wifi name  " + testName  +"\nlevel" + data.data[0].Level + " location " + data.data[0].location);
                            writeLogs("id =  " +  data.data[0].id + " location = " + data.data[0].location + " level " +  data.data[0].Level);
                            // *****id return is the table column id ** NOT THE PATTERN
                            referenceId = data.data[0].id;
                            getCurrentLocation(130, referenceId, referenceType); // lat, lng, location, eventId, referenceId, referenceType
                        } else {
                            //alert("nearby wifi name " + testName + " Unable to pinpoint location, no matching found in the algo");
                        }
                    } else {
                       getCurrentLocation();
                    }
                },
                error: function (error, errorText, errorThrown) {
                    console.log("returnwifi error: " + error.responseText + " errorText: " + errorText + " errorThrown: " + errorThrown);
                    navigator.notification.alert('Returnwifi error:: ' + error.responseText
                                                                    + '\nerrorText: ' + errorText
                                                                    + '\nNature of Dev: ' + natureOfDev
                                                                    + '\nerrorThrown: ' + errorThrown
                                                                    + '\nStatus: ' + applicationStatus, function () {
                                                            }, 'Error!!!!!', 'OK');
                    getCurrentLocation();
                }
            });
        }, function (error, errorText, errorThrown) {
            navigator.notification.alert('Error:: ' + error.responseText
                                                                                + '\nerrorText: ' + errorText
                                                                                + '\nerrorThrown: ' + errorThrown
                                                                                + '\nStatus: ' + applicationStatus, function () {
                                                                        }, 'Error!!!!!', 'OK');
            getCurrentLocation();
        });
    } else {
        getCurrentLocation();
    }
}

function getCurrentLocation(eventId, referenceId, referenceType) {
    var geoOptions = {enableHighAccuracy: true, timeout: 10000};
    navigator.geolocation.getCurrentPosition(function (position)
    {
        var lat = position.coords.latitude;
        var lng = position.coords.longitude;
        if (eventId === 130) {
            sendLocation(lat, lng, "", eventId, referenceId, referenceType);
        } else {
            sendLocation(lat, lng, "", "", "", "");
        }
    }, function (error) {
        //checkGPSService();
        //no need to send. No Wifi location nor GPS locations
        geolocFail();
        if (eventId === 130) {
            sendLocation(0, 0, "", eventId, referenceId, referenceType);
        }
    }, geoOptions);

    function geolocFail() {
        console.log("Get User LongLat Failed or Timed Out");
    }
}


function sendLocation(lat, lng, location, eventId, referenceId, referenceType) {
    var user_id = window.sessionStorage["userID"];
    var asset_id = window.sessionStorage["assetId"];
    var unit_id = window.localStorage['unitId'];

    if (eventId != ""){ // if you want to insert stuff into dev server, use direct = 1;
        var updateUserGps_URL = databaseIP + "Controller/mobile_controller.jsp?type=track&action=gps&driver=" + encodeURIComponent(user_id) + "&assetId=" + encodeURIComponent(asset_id) + "&longitude=" + encodeURIComponent(lng) + "&latitude=" + encodeURIComponent(lat) + "&location=" + encodeURIComponent(location)
                                + "&event=" + encodeURIComponent(eventId) + "&reference=" + encodeURIComponent(referenceId) + "&referenceType=" + encodeURIComponent(referenceType) + "&unitId=" + encodeURIComponent(unit_id);
    } else {
        var updateUserGps_URL = databaseIP + "Controller/mobile_controller.jsp?type=track&action=gps&driver=" + encodeURIComponent(user_id) + "&assetId=" + encodeURIComponent(asset_id) + "&longitude=" + encodeURIComponent(lng) + "&latitude=" + encodeURIComponent(lat) + "&unitId=" + encodeURIComponent(unit_id);
    }
    console.log(updateUserGps_URL);
    $.ajax({
        url: updateUserGps_URL,
        type: 'GET',
        timeout: 30000,
        success: function (data) {
            if (data.result) {
                console.log("result = true; update to gps;");
            } else {
                console.log("result = false; no update to gps.fail to update gps");
            }
        },
        error: function (error, errorText, errorThrown) {
            console.log("updateUserGps error: " + error + " errorText: " + errorText + " errorThrown: " + errorThrown);
        }
    });
}

var count;
var counter;
var jobsLoaded = 0;
var allJob = [];


function loadJob(type) {

    var tuploadQueue = [];
    console.log("X9");
    if (localStorage.getItem("uploadQueue") != "[]" && localStorage.getItem("uploadQueue") != null) {
        tuploadQueue = JSON.parse(window.localStorage["uploadQueue"]).toString().split(",");
        uploadCount = tuploadQueue.length;
        $('.uploadCount span').html(uploadCount); //update Upload count
        console.log("DEBUG7:",index)
    } else {
        console.log("DEBUG6:")
        $('.uploadCount span').html("0"); //update Upload count
    }
    var user_id = window.sessionStorage["userID"];
    var fetch = 10;
    var offset = 0;
    var downloadURL;
    var newJob; //boolean to determine whether there were new jobs loaded
    if (type == "all") {
//        $('#main .jobList ul').html(''); //clear list
//        $('#main .jobCount span').html('0'); //reset count
//        jobsLoaded = 0;
//        allJob = [];
        loadDownload("all");
        newJob = false;
    } else if (type == "new") {
        loadDownload("new");
        newJob = false;
    }

    function loadDownload(type) {
        if (type == "all") {
            downloadURL = databaseIP + "/Controller/mobile_controller.jsp?type=job&action=download&fetch=" + fetch + "&offset=" + offset + "&driver=" + user_id + "&mode=2";
        } else if (type == "new") {
            downloadURL = databaseIP + "/Controller/mobile_controller.jsp?type=job&action=download&fetch=" + fetch + "&offset=" + offset + "&driver=" + user_id + "&mode=1";
        }
        console.log("downloadURL: " + downloadURL);
        $.ajax({
            url: downloadURL,
            type: 'GET',
            timeout: 30000,
            success: function (data) {
                if (data.result)
                {
                    // only reset if successfully retrieve
                    if (parseInt(offset,10) == 0)
                    {
                        $('#main .jobList ul').html(''); //clear list
                        $('#main .jobCount span').html('0'); //reset count
                        jobsLoaded = 0;
                        allJob = [];
                    }

                    if (data.data.total != 0)
                    {
                        var receivedJob = [];
                        count = 0;

                        var uploadQueueArr = [];
                        if (window.localStorage["uploadQueue"])
                        {
                            uploadQueueArr = JSON.parse(window.localStorage["uploadQueue"]).toString().split(",");
                        }
                        console.log('upload queue arr', uploadQueueArr);

                        var allHtml = [];
                        var jobIdSeq = [];

                        while (data.data.jobs[count])
                        {
                            var singleHtml = '';

                            var duration = data.data.jobs[count].duration;
                            var schedule_dt = data.data.jobs[count].schedule_dt;
                            var format_dt = schedule_dt.slice(0, 4) + "/" + schedule_dt.slice(4, 6) + "/" + schedule_dt.slice(6, 8) + " " + schedule_dt.slice(8, 10) + ":" + schedule_dt.slice(10, 12) + ":" + schedule_dt.slice(12, 14);
                            var id = data.data.jobs[count].id;


                            // CHX2409
                            var jobIsUploading = false;
                            for (var i = 0 ; i < uploadQueueArr.length ; i++)
                            {
                                var jobIdOnlyArr = uploadQueueArr[i].split("_");
                                if (jobIdOnlyArr[0] == id)
                                {
                                    jobIsUploading = true;
                                    break;
                                }
                            }
                            if (jobIsUploading)
                            {
                                count++;
                                continue;
                            }
                            // CHX2409


                            var job_type_id = data.data.jobs[count].job_type_id;
                            var job_type;
                            if (job_type_id == "1") {
                                job_type = lang.Mobile108;
                            } else if (job_type_id == "2") {
                                job_type = lang.Mobile109;
                            } else if (job_type_id == "3") {
                                job_type = lang.Mobile110;
                            }
                            ;
                            var job_location = data.data.jobs[count].location;
                            var latitude = data.data.jobs[count].latitude;
                            var longitude = data.data.jobs[count].longitude;
                            var status = data.data.jobs[count].status;

                            var description = '-';
                            if (data.data.jobs[count].description)
                            {
                                description = data.data.jobs[count].description;
                            }
                            var job_number = data.data.jobs[count].job_id;
                            var ref_no = '-'
                            if (data.data.jobs[count].application_ref_no)
                            {
                                ref_no = data.data.jobs[count].application_ref_no;
                            }

                            var applicantName = data.data.jobs[count].applicant_name;
                            var address = data.data.jobs[count].address;
                            var natureOfDev = data.data.jobs[count].nature_of_dev;
                            var applicationStatus = data.data.jobs[count].application_status;
                            var landUse = data.data.jobs[count].land_use;



                            var preview = '';
                            if (data.data.jobs[count].preview != "PGRpdiBjbGFzcz0iam9iLXByZXZpZXciPjwvZGl2Pg==") {
                                preview = data.data.jobs[count].preview;
                            }
                            var template_name = data.data.jobs[count].template_name;
                            var details = Base64.decode(data.data.jobs[count].details);
                            var html_file = id + "_" + schedule_dt + "_" + user_id + ".v3";
                            if ($('li[job_id=' + id + ']').length == 0)
                            { //check if alrdy exist in local
                                /** for sorting purposes **/

                                singleHtml += "<li name='" + html_file + "' job_name='" + template_name + "' ref_no='" + ref_no + "' job_id='" + id
                                                + "' job_type_id='" + job_type_id + "' job_status='" + status + "' latitude='" + latitude + "' longitude='" + longitude
                                                + "' applicant_name='" + applicantName + "' address='" + address + "' nature_of_dev='" + natureOfDev
                                                + "' application_status='" + applicationStatus + "' land_use='" + landUse + "'>" +
                                        "<a href='#'><span class='job-title'><span class='job-value'><b>" + ref_no + "</b></span></span></a><br>";

                                if (latitude != 0 && longitude != 0) {
                                    singleHtml += "<span class='job-title' ><span class='job-value job-navigate' style='color:blue;font-weight:bold!important'>" + lang.Mobile054 + "</span></span>";
                                }

                                singleHtml += "<span class='job-title'><span class='job-value job-dl' style='color:blue;font-weight:bold!important'>Download Application Files</span></span>";

                                if (applicantName)
                                {
                                    singleHtml += "<span class='job-title'><span class='job-details'>View Application Details</span></span><br>";
                                }

                                singleHtml += "<span class='job-title'><span class='job-value job-dt'>" + format_dt + "</span></span><br>" +
                                        "<span class='job-title'><span class='job-value job-status'>" + stat(status) + "</span></span><br>" +
                                        "<span class='job-title'><span class='job-value'>" + template_name + "</span></span><br>" +
                                        "<span class='job-title'><span class='job-value'>" + description + "</span></span><br>" +
                                        Base64.decode(preview);

                                if (window.localStorage["sort"] != 'auto')
                                {
                                     singleHtml += "<span class='job-title'>"
                                            + "<div class=\"sort-div sort-down\" style='color: #990000'><img src='img/ic_down_small.png' /> MOVE DOWN</div>"
                                            + "<div class=\"sort-div sort-up\" style='color: #009900'><img src='img/ic_up_small.png' /> MOVE UP</div>"
                                        + "</span><br>";
                                }


                                allHtml[count] = singleHtml;
                                jobIdSeq[count] = id;
                            }
                            else
                            { //else update
                                $('#main .jobList li[job_id=' + id + ']').attr('name', html_file);
                                $('#main .jobList li[job_id=' + id + ']').attr('job_name', template_name);
                                $('#main .jobList li[job_id=' + id + ']').attr('job_id', id);
                                $('#main .jobList li[job_id=' + id + ']').attr('job_type_id', job_type_id);
                                $('#main .jobList li[job_id=' + id + ']').attr('job_status', status);
                                $('#main .jobList li[job_id=' + id + ']').attr('latitude', latitude);
                                $('#main .jobList li[job_id=' + id + ']').attr('longitude', longitude);

                                $('#main .jobList li[job_id=' + id + ']').attr('applicant_name', applicantName);
                                $('#main .jobList li[job_id=' + id + ']').attr('address', address);
                                $('#main .jobList li[job_id=' + id + ']').attr('nature_of_dev', natureOfDev);
                                $('#main .jobList li[job_id=' + id + ']').attr('application_status', applicationStatus);
                                $('#main .jobList li[job_id=' + id + ']').attr('land_use', landUse);

                                $('#main .jobList li[job_id=' + id + ']').html(
                                        "<span class='job-title'><span class='job-value'><b>" + ref_no + "</b></span></span><br>" +
                                        "<span class='job-title'><span class='job-value job-dt'>" + format_dt + "</span></span><br>" +
                                        "<span class='job-title'><span class='job-value job-status'>" + stat(status) + "</span></span><br>" +
                                        "<span class='job-title'><span class='job-value'>" + template_name + "</span></span><br>" +
                                        "<span class='job-title'><span class='job-value'>" + description + "</span></span><br>" +

                                        Base64.decode(preview));
                                if (latitude != 0 && longitude != 0 && $('li[job_id=' + id + '] .job-navigate').length == 0) {
                                    $('li[job_id=' + id + ']').prepend("<span class='job-title' style='border-bottom:2px solid #eeeeee;margin:5px;'><img src='img/navigate.png' /><span class='job-value job-navigate' style='color:blue;font-weight:bold!important'>" + lang.Mobile054 + "</span></span>");
                                }
                                $('li[job_id=' + id + ']').append("<span class='job-title'>"
                                            + "<div class=\"sort-div sort-down\" style='color: #990000'><img src='img/ic_down_small.png' /> MOVE DOWN</div>"
                                            + "<div class=\"sort-div sort-up\" style='color: #009900'><img src='img/ic_up_small.png' /> MOVE UP</div>"
                                        + "</span><br>");
                            }


                            if (type == "all")
                            {
                                allJob.push(id);
                                newDownload(html_file, details);

                                if (status == "2")
                                { //if it's scheduled planned job
                                    console.log('ehhhh')
                                    receivedJob.push(id); //push in array for status change to received
                                    $('#main .jobList li[job_id=' + id + ']').attr('job_status', '12'); //update status display in advanced
                                    console.log('new for id ' + id + ', count = ' + count);
                                    $('#main .jobList li[job_id=' + id + '] .job-status').html("<mark style='background-color:#CBA2E4;border-radius:5px;padding:0 10px;color:#FFFFFF;'>New</mark>");
                                }
                                jobsLoaded++;
                                $('#main .jobCount span').html(jobsLoaded);
                            }
                            else if (type == "new")
                            {
                                if (status == "2")
                                {
                                    newJob = true;
                                    allJob.push(id);
                                    newDownload(html_file, details);

                                    receivedJob.push(id); //push in array for status change to received
                                    $('#main .jobList li[job_id=' + id + ']').attr('job_status', '12'); //update status display in advanced
                                    console.log('new for id ' + id + ', count = ' + count);
                                    $('#main .jobList li[job_id=' + id + '] .job-status').html("<mark style='background-color:#CBA2E4;border-radius:5px;padding:0 10px;color:#FFFFFF;'>New</mark>");
                                    jobsLoaded++;
                                    $('#main .jobCount span').html(jobsLoaded);
                                } else if (status == "8" || status == "9" || status == "12" || status == "13") { //ended/handover/received/uploading job that is likely to be a broadcast
                                    offset++;
                                }
                                count++;
                            }
                        }


//                        var sequenceArr = [];
//                        sequenceArr[0] = "1071";
//                        sequenceArr[1] = "1069";
//                        sequenceArr[2] = "1066";
//                        sequenceArr[3] = "1065";
//                        localStorage.setItem("sortsequence", JSON.stringify(sequenceArr));

                        var loadedHtml = "";

                        if (window.localStorage["sort"] == 'auto')
                        {
                            for (var j = 0; j < jobIdSeq.length ; j++)
                            {
                                if (allHtml[j])
                                {
                                    loadedHtml += allHtml[j];
                                }
                            }

                            localStorage.setItem("sortsequence", JSON.stringify(jobIdSeq));
                        }
                        else
                        {
                            var sortSequence = JSON.parse(localStorage.getItem("sortsequence"));

                            // check if job is new...
                            if (sortSequence.length < jobIdSeq.length)
                            {
                                for (var i = 0 ; i < jobIdSeq.length ; i++)
                                {
                                    var isNew = true;

                                    for (var j = 0; j < sortSequence.length ; j++)
                                    {
                                        if (parseInt(jobIdSeq[i],10) == parseInt(sortSequence[j],10))
                                        {
                                            isNew = false;
                                            break;
                                        }
                                    }

                                    if (isNew)
                                    {
                                        if (allHtml[i])
                                        {
                                            loadedHtml += allHtml[i];
                                        }
                                    }
                                }
                            }

                            for (var i = 0 ; i < sortSequence.length ; i++)
                            {
                                for (var j = 0; j < jobIdSeq.length ; j++)
                                {
                                    if (parseInt(sortSequence[i],10) == parseInt(jobIdSeq[j],10))
                                    {
                                        if (allHtml[j])
                                        {
                                            loadedHtml += allHtml[j];
                                        }
                                        break;
                                    }
                                }
                            }
                        }


                        $('#main .jobList ul').append(loadedHtml);
                        saveCurrentSequence();


                        var now = getCurrentDateTime(4);
                        $('#main .lastUpdate span').html(now);

                        if (receivedJob.length != 0) {
                            updateReceived(data.data.total); //update server on received jobs.
                        } else {
                            fetchAgain(data.data.total);
                        }
                        function updateReceived(totalloaded) {
                            var receivedJobString = receivedJob.toString();
                            var receivedStatus = "12";

                            var now = new Date();
                            var now = two(now.getDate()) + two(now.getMonth() + 1) + now.getFullYear() + two(now.getHours()) + two(now.getMinutes()) + two(now.getSeconds());

                            // add in driver id.
                            var user_id = window.sessionStorage["userID"];
                            var statuschange_URL = databaseIP + "/Controller/mobile_controller.jsp?type=job&action=statusChange&jobScheduleIds=" + receivedJobString + "&statusId=" + receivedStatus + "&driverId=" + user_id + "&dateTime=" + now;
                            $.ajax({
                                url: statuschange_URL,
                                type: 'GET',
                                timeout: 30000,
                                success: function (data) {
                                    if (data.result) {
                                        writeLogs("statuschange success: Received " + receivedJobString);
                                        console.log("statuschange statuschange_URL1 " + statuschange_URL);
                                        fetchAgain(totalloaded);
                                    } else {
                                       // console.log("statuschange fail: " + data.text + ". Retrying");
                                        writeLogs("updateReceived, statuschange fail: " + data.text + ". Retrying. Possible Loop");
                                        //updateReceived(); //retry lack one parameter and seem to go into infitie loop
                                    }
                                },
                                error: function (error, errorText, errorThrown) {
                                    writeLogs("loadDownload, statuschange error: " + error + " errorText: " + errorText + " errorThrown: " + errorThrown);
                                    //console.log("statuschange error: " + error.responseText + " errorText: " + errorText + " errorThrown: " + errorThrown);
                                }
                            });
                        }
                        function fetchAgain(totalloaded) {
                            if (totalloaded != 0)
                            { //check if there may be more jobs to add to queue
                                console.log("Fetching again");
                                if (type == "all")
                                {
                                    offset = offset + fetch;
                                    loadDownload("all");
                                } else if (type == "new") {
                                    console.log("TYPE NEW");
                                    loadDownload("new");
                                }
                            }
                            else
                            { //no more jobs to fetch, proceed to bind list items
                                console.log("else");
                                $('#main .jobList li').off('click');
                                $('#main .jobList li').on('click', function () {
                                    if ($(this).attr('name') != null
                                            && $(e.target).attr('class') != "job-value job-navigate"
                                            && $(e.target).attr('class') != "job-details"
                                            && $(e.target).attr('class') != "job-value job-dl"
                                            && $(e.target).attr('class') != "sort-div sort-down"
                                            && $(e.target).attr('class') != "sort-div sort-up") {
                                        goForm($(this).attr('job_id'), $(this).attr('name'), $(this).attr('job_name'), $(this).attr('job_type_id'), $(this).attr('job_status'));
                                    }
                                });

                                $('#main .jobList .job-navigate').unbind('click'); //xxx
                                $('#main .jobList .job-navigate').bind('click', function () {

                                    var networkState = navigator.connection.type;
                                    if (networkState === Connection.NONE)
                                    {
                                        navigator.notification.alert(lang.Mobile068, function () {
                                            }, 'Unable to Navigate', 'OK');
                                        return;
                                    }

                                    var lat = $(this).parent().parent().attr('latitude');
                                    var lng = $(this).parent().parent().attr('longitude');
                                    if (lat != "0" && lng != "0" && lat != undefined && lng != undefined) {
                                        $("#confirmPopup").css({"width": "240px"});
//                                        var staticmap = 'https://maps.googleapis.com/maps/api/staticmap?center=' + lat + ',' + lng + '&zoom=15&size=260x260&maptype=roadmap&markers=color:red%7C' + lat + ',' + lng;
                                        var staticmap = 'http://www.v3nity.com:80/V3Nity4/googleapi?type=map&action=static&lat=' + lat + '&lon=' + lng + '&maptype=roadmap&zoom=15&width=260&height=260'; // not using databaseIP cause only V3Nity4 have this new function as of 20 sep
                                        confirmPopup(
                                                "<div style='min-width:260px;min-height:260px'><img src='" + staticmap + "' style='max-height:100%;max-width:100%'/></div>"
                                                , function (response) {
                                                    rebindMainJobList();
                                                    if (response == 2) { //if Yes
                                                        if (device.platform == "android" || device.platform == "Android") {
                                                            console.log("device platform is " + device.platform);
                                                            window.open('google.navigation:q=' + lat + ',' + lng, '_system');
                                                        } else {
                                                            console.log("device platform is " + device.platform);
                                                            window.open('http://maps.google.com/?q=' + lat + ',' + lng, '_system');
                                                        }
                                                        $("#confirmPopup").css({"width": "initial"});
                                                    } else {
                                                        //else do nothing
                                                        $("#confirmPopup").css({"width": "initial"});
                                                    }
                                                }, lang.Mobile053, ["CANCEL", "OK"]);
                                    } else {
                                        // navigator.notification.alert('Unable to show map. Location coordinates are not available for this job.',function(){},'Coordinates Unavailable','OK');
                                    }
                                });


                                $('#main .jobList .job-details').unbind('click'); //xxx
                                $('#main .jobList .job-details').bind('click', function () {
                                    var applicantName = $(this).parent().parent().attr('applicant_name');
                                    var address = $(this).parent().parent().attr('address');
                                    var natureOfDev = $(this).parent().parent().attr('nature_of_dev');
                                    var landUse = $(this).parent().parent().attr('land_use');
                                    var applicationStatus = $(this).parent().parent().attr('application_status');


                                    if (applicantName)
                                    {
                                        navigator.notification.alert('Name: ' + applicantName
                                                + '\nAddress: ' + address
                                                + '\nNature of Dev: ' + natureOfDev
                                                + '\nLand Use: ' + landUse
                                                + '\nStatus: ' + applicationStatus, function () {
                                        }, 'Application Details', 'OK');
                                    }
                                    else
                                    {
                                        // navigator.notification.alert('Unable to show map. Location coordinates are not available for this job.',function(){},'Coordinates Unavailable','OK');
                                    }
                                });


                                $('#main .jobList .job-dl').unbind('click'); //xxx
                                $('#main .jobList .job-dl').bind('click', function () {
                                        var refNo = $(this).parent().parent().attr('ref_no');
                                        getApplicationDownloadUrl(refNo);
                                });

                            }
                        }
                        // spinOut()
                    }

                    else if (jobsLoaded != 0)
                    { //no more jobs to fetch, proceed to bind list items
//                        console.log("Fetching Finished.");
//                        console.log("ALL JOBS: " + allJob.toString());
                        $('#main .jobList li').off('click');
                        $('#main .jobList li').on('click', function (e) {
                            if ($(this).attr('name') != null
                                    && $(e.target).attr('class') != "job-value job-navigate"
                                    && $(e.target).attr('class') != "job-details"
                                    && $(e.target).attr('class') != "job-value job-dl"
                                    && $(e.target).attr('class') != "sort-div sort-down"
                                    && $(e.target).attr('class') != "sort-div sort-up") {
                                goForm($(this).attr('job_id'), $(this).attr('name'), $(this).attr('job_name'), $(this).attr('job_type_id'), $(this).attr('job_status'),false);
                            }
                        });


                        $('#main .jobList .job-navigate').unbind('click'); //xxx
                        $('#main .jobList .job-navigate').bind('click', function () {

                            var networkState = navigator.connection.type;
                            if (networkState === Connection.NONE)
                            {
                                navigator.notification.alert(lang.Mobile068, function () {
                                    }, 'Unable to Navigate', 'OK');
                                return;
                            }

                            var lat = $(this).parent().parent().attr('latitude');
                            var lng = $(this).parent().parent().attr('longitude');
                            if (lat != "0" && lng != "0" && lat != undefined && lng != undefined) {
                                $("#confirmPopup").css({"width": "240px"});
//                                var staticmap = 'https://maps.googleapis.com/maps/api/staticmap?center=' + lat + ',' + lng + '&zoom=15&size=260x260&maptype=roadmap&markers=color:red%7C' + lat + ',' + lng;
                                var staticmap = 'http://www.v3nity.com:80/V3Nity4/googleapi?type=map&action=static&lat=' + lat + '&lon=' + lng + '&maptype=roadmap&zoom=15&width=260&height=260'
                                confirmPopup(
                                        "<div style='height:260px'><img src='" + staticmap + "' style='max-height:100%;max-width:100%'/></div>"
                                        , function (response) {
                                            rebindMainJobList();
                                            if (response == 2) { //if Yes
                                                if (device.platform == "android" || device.platform == "Android") {
                                                    console.log("device platform is " + device.platform);
                                                    window.open('google.navigation:q=' + lat + ',' + lng, '_system');
                                                } else {
                                                    console.log("device platform is " + device.platform);
                                                    window.open('http://maps.google.com/?q=' + lat + ',' + lng, '_system');
                                                }
                                                $("#confirmPopup").css({"width": "initial"});
                                            } else {
                                                //else do nothing
                                                $("#confirmPopup").css({"width": "initial"});
                                            }
                                        }, "Map", ["CANCEL", "OK"]);
                            } else {
                                // navigator.notification.alert('Unable to show map. Location coordinates are not available for this job.',function(){},'Coordinates Unavailable','OK');
                            }
                        });

                        $('#main .jobList .sort-up').unbind('click'); //xxx
                        $('#main .jobList .sort-up').bind('click', function () {
                                var jobId = $(this).parent().parent().attr('job_id');
                                $(this).parent().moveUp();
                        });


                        $('#main .jobList .sort-down').unbind('click'); //xxx
                        $('#main .jobList .sort-down').bind('click', function () {
                                var jobId = $(this).parent().parent().attr('job_id');
                                $(this).parent().moveDown();
                        });

                        $('#main .jobList .job-dl').unbind('click'); //xxx
                        $('#main .jobList .job-dl').bind('click', function () {
                                var refNo = $(this).parent().parent().attr('ref_no');
                                getApplicationDownloadUrl(refNo);
                        });


                        $('#main .jobList .job-details').unbind('click'); //xxx
                        $('#main .jobList .job-details').bind('click', function () {
                            var applicantName = $(this).parent().parent().attr('applicant_name');
                            var address = $(this).parent().parent().attr('address');
                            var natureOfDev = $(this).parent().parent().attr('nature_of_dev');
                            var landUse = $(this).parent().parent().attr('land_use');
                            var applicationStatus = $(this).parent().parent().attr('application_status');

                            if (applicantName)
                            {
                                navigator.notification.alert('Name: ' + applicantName
                                        + '\nAddress: ' + address
                                        + '\nNature of Dev: ' + natureOfDev
                                        + '\nLand Use: ' + landUse
                                        + '\nStatus: ' + applicationStatus, function () {
                                }, 'Application Details', 'OK');
                            }
                            else
                            {
                                // navigator.notification.alert('Unable to show map. Location coordinates are not available for this job.',function(){},'Coordinates Unavailable','OK');
                            }
                        });



                        if (newJob)
                        { //if new jobs is loaded in loadNew
                            navigator.notification.beep(1);
                            navigator.vibrate(1000);
                        }
                        updateJob();
//                        checkBluetoothInterval();
                    }
                    else
                    {
                        localStorage.removeItem("localJobList");
                        // $('#main .jobList ul').html('<li style="text-align:center"><br>No Jobs Available</li>');
                        $('#main .jobCount span').html("0");
                        var now = getCurrentDateTime(4);
                        $('#main .lastUpdate span').html(now);
                        // spinOut()
                    }
                } else {
                    // navigator.notification.alert('Failed to load job list. ID does not exist.',function(){},'Loading Failed','OK');
                    // // spinOut()
                    // logout();
                }
//                checkBluetoothInterval();
            },
            error: function (error, errorText, errorThrown) {
                writeLogs("loadDownload, Error: " + error.code + " errorText: " + errorText + " errorThrown: " + errorThrown);
                //console.log("Error: " + error.responseText + " errorText: " + errorText + " errorThrown: " + errorThrown);
            }
        });
    }
}


$.fn.moveUp = function() {
    before = $(this).parent().prev();
    $(this).parent().insertBefore(before);

    saveCurrentSequence();
}

$.fn.moveDown = function() {
    after = $(this).parent().next();
    $(this).parent().insertAfter(after);

    saveCurrentSequence();
}

function saveCurrentSequence()
{
    var sequenceArr = [];
    var count = 0;

    $('ul li').each(function(i)
    {
        sequenceArr[count] = $(this).attr('job_id');
        count++;
    });

    localStorage.setItem("sortsequence", JSON.stringify(sequenceArr));
}

//$('li').click(function() {
//    $(this).moveDown();
//});

function updateJob() {
    if ($('#main').is(":visible")) {
        var tuploadQueue = [];
        if (localStorage.getItem("uploadQueue") != "[]" && localStorage.getItem("uploadQueue") != null) {
       console.log("X10");

            tuploadQueue = JSON.parse(window.localStorage["uploadQueue"]).toString().split(",");
            uploadCount = tuploadQueue.length;
            console.log("DEBUG8:")
           // TODO update uploadCount-1 -> uploadCount
            $('.uploadCount span').html(uploadCount); //update Upload count
        } else {
            console.log("DEBUG9");
            $('.uploadCount span').html("0"); //update Upload count
        }
        //do something that loops through each job, get their ID, check and update their statuses
        var jobList = [];
        var jobStatus = [];

        for (i = 0; i < $('#main .jobList li').length; i++) {
            jobList.push($('#main .jobList li').eq(i).attr('job_id'));
        }

        if (jobList.length != 0) {
            var checkstatus_URL = databaseIP + "/Controller/mobile_controller.jsp?type=job&action=checkStatus&jobScheduleIds=" + jobList.toString();
            $.ajax({
                url: checkstatus_URL,
                type: 'GET',
                timeout: 30000,
                success: function (data)
                {
                    if (data.result)
                    {
                        console.log('Submit job data 123:',JSON.stringify(data));
                        console.log("checkstatus success: " + data.arrStatus);
                        console.log("checkstatus_URL: " + checkstatus_URL);
                        jobStatus = data.arrStatus.split(",");
                        var finalJobCount = jobStatus.length;
                        for (i = 0; i < $('#main .jobList li').length; i++) {
                            switch (jobStatus[i]) {
                                case "1": //Unscheduled
                                case "2": //Scheduled
                                case "3": //Approved
                                case "4": //Dispatched
                                case "6": //Arrived
                                case "7": //Started
                                case "12": //Received
                                    // list.jobs[i].status = jobStatus[i]; //update local list
                                    $('#main .jobList li').eq(i).attr('job_status', jobStatus[i]);
                                    $('#main .jobList li').eq(i).find('.job-status').html(stat(jobStatus[i]));
                                    break;
                                case "0": //Deleted
                                case "8": //Ended
                                case "9": //Handover
                                case "10": //Rejected
                                case "11": //Cancelled
                                    // list.jobs.splice(i,1); //update local list
                                    var html_file = $('#main .jobList li').eq(i).attr('name');
                                    writeLogs("updateJob, jobstatus is 11 = cancelled. Deleting fileName : " + html_file);
                                    resetFormDeleter();
                                    newDeleteFile(html_file, 0);
                                    //26Sep
//                                    appDirectory.getFile(html_file, {create: false}, function (fileEntry) {
//                                        fileEntry.remove(function () {
//                                            console.log("checkstatus deleted: " + html_file);
//                                        }, function () {
//                                            "checkstatus error: deleting failed.";
//                                        });
//                                    }, function () {
//                                        console.log('checkstatus: file does not exist');
//                                    });
                                    $('#main .jobList li').eq(i).remove();
                                    finalJobCount = finalJobCount - 1;
                                    break;
                                case "5": //Acknowledged (means Broadcast Job) // JX : not sure if this will cause error as ajax is callback and the html_file might be replaced? need to test.
                                    var job_id = $('#main .jobList li').eq(i).attr('job_id');
                                    var html_file = $('#main .jobList li').eq(i).attr('name');
                                    var checkstatus_URL = databaseIP + "/Controller/mobile_controller.jsp?type=job&action=checkStatus&jobScheduleIds=" + job_id;
                                    $.ajax({
                                        url: checkstatus_URL,
                                        type: 'GET',
                                        timeout: 30000,
                                        success: function (data) {
                                            if (data.result) {
                                                console.log("checkstatus_URL: " + checkstatus_URL);
                                                console.log("checkstatus success: " + data.arrDriverId);
                                                var job_status = data.arrStatus;
                                                var driver_id = data.arrDriverId;
                                                var user_id = window.sessionStorage["userID"];
                                                if (driver_id == user_id) {
                                                    $('#main .jobList li[job_id=' + job_id + ']').attr('job_status', '5');
                                                    $('#main .jobList li[job_id=' + job_id + ']').find('.job-status').html("<mark style='background-color:#FFBC00;border-radius:5px;padding:0 10px;color:#FFFFFF;'>Accepted</mark>");
                                                } else { //broadcast taken by someone else
                                                    writeLogs("updateJob, jobstatus is 5 = Accepted. Deleting fileName : " + html_file);
                                                    resetFormDeleter();
                                                    newDeleteFile(html_file, 0);
                                                    $('#main .jobList li[job_id=' + job_id + ']').remove();
                                                    finalJobCount = finalJobCount - 1;
                                                }
                                            } else {
                                                spinOut();
                                                loadJob("all");
        //loadJob("new");
                                            }
                                        },
                                        error: function (error, errorText, errorThrown) {
                                            spinOut();
                                            writeLogs("updateJob, checkstatus error: " + error + " errorText: " + errorText + " errorThrown: " + errorThrown );
                                            //console.log("checkstatus error: " + error.responseText + " errorText: " + errorText + " errorThrown: " + errorThrown);
                                        }
                                    });
                                    break;
                                case "13": //Uploading
                                    // list.jobs.splice(i,1); //update local list
                                    console.log("Remove Job");
                                    $('#main .jobList li').eq(i).remove();
                                    finalJobCount = finalJobCount - 1;
                                    // var html_file = $('#main .jobList li').eq(i).attr('name');
                                    // queueJob(html_file)
                                    break;
                                default:
                                    break;
                            }
                            jobList.push($('#main .jobList li').eq(i).attr('job_id'));
                        }
                        var now = getCurrentDateTime(4);
                        $('#main .lastUpdate span').html(now);
                        setTimeout(function () {
                            $('.jobCount span').html(finalJobCount); //update Job count
                        }, 200);
                    }
                },
                error: function (error, errorText, errorThrown) {
                    writeLogs("updateJob, checkstatus error: " + error + " errorText: " + errorText + " errorThrown: " + errorThrown);
                    //console.log("checkstatus error: " + error.responseText + " errorText: " + errorText + " errorThrown: " + errorThrown);
                }
            });
        } else {
            var now = getCurrentDateTime(4);
            $('#main .lastUpdate span').html(now);
            $('.jobCount span').html('0');
        }
    } else {
        console.log("checkstatus: user is not on job list.")
    }
}

function goForm(job_id, html_file, job_name, job_type_id, job_status, isBeaconJob)
{
    spinIn();
    window.sessionStorage["selected_id"] = job_id;
    window.sessionStorage["selected_file"] = html_file;
    window.sessionStorage["selected_name"] = job_name;

//    if($('#main .jobList li[job_id=' + job_id + ']').children(".job-preview").find(".job-preview-bluetooth-status").hasClass("job-preview-bluetooth-status")) {
//        console.log($('#main .jobList li[job_id=' + job_id + ']').children(".job-preview").find(".job-preview-bluetooth-status").css('background-color'));
//        if ($('#main .jobList li[job_id=' + job_id + ']').find('.job-preview-bluetooth-status').css('background-color') == "rgb(255, 0, 0)"){ // if color = red, exit this function
//            spinOut();
//            navigator.notification.alert("Please move nearer to job location.", function () {}, "Unable to start job", 'OK');
//            return false;
//        }
//    }
    var checkstatus_URL = databaseIP + "/Controller/mobile_controller.jsp?type=job&action=checkStatus&jobScheduleIds=" + job_id;
    $.ajax({
        url: checkstatus_URL,
        type: 'GET',
        timeout: 15000,
        success: function (data) {
            if (data.result) {
                console.log('Submit job data:',JSON.stringify(data));
                console.log("checkstatus_URL: " + checkstatus_URL);
                console.log("checkstatus success, status = " + data.arrStatus +  " driverId = "+ data.arrDriverId);
                job_status = data.arrStatus;
                var driver_id = data.arrDriverId;
                var user_id = window.sessionStorage["userID"];
                    if (job_type_id == "1" || job_type_id == "3") { //if planned job or adhoc job
                        if (job_status != "0") {
                            spinOut();
                            startJob();
                            writeLogs("Starting Job Id : " + job_id + " Job Type : " + job_type_id );
                        } else {
                            spinOut();
                            navigator.notification.alert(lang.Mobile056, function () {
                            }, lang.Mobile055, 'OK');
                            loadJob("all");
            //loadJob("new");
                        }
                    } else if (job_type_id == "2") { //if broadcast job
                        if (job_status == "12") { //if broadcast job is a new job that has not been accepted
                            spinOut();
                            startJob();
                            writeLogs("Starting Job Id : " + job_id + "Job Type : " + job_type_id );
                        } else if (job_status == "5" && driver_id == user_id) { //if broadcast job has been accepted and job belongs to this driver
                            spinOut();
                            startJob();
                            writeLogs("Starting Job Id : " + job_id + "Job Type : " + job_type_id );
                        } else if (job_status == "7" && driver_id == user_id) { //if broadcast job has started and job belongs to this driver
                            spinOut();
                            startJob();
                            writeLogs("Starting Job Id : " + job_id + "Job Type : " + job_type_id );
                        } else { //else broadcast job has been taken
                            spinOut();
                            navigator.notification.alert(lang.Mobile057, function () {
                            }, lang.Mobile055, 'OK');
                            resetFormDeleter();
                            newDeleteFile(html_file, 0);
                            //26Sep - DONE
                            appDirectory.getFile(html_file, {create: false}, function (fileEntry) {
                                fileEntry.remove(function () {
                                    writeLogs("goForm, checkStatus deleted : " + html_file);
                                    //console.log("checkstatus deleted: " + html_file);
                                }, function () {
                                    writeLogs("checkstatus error: deleting failed.");
                                    //console.log("checkstatus error: deleting failed.");
                                });
                            }, function () {
                                console.log('checkstatus: file does not exist');
                            });
                            //26Sep - DONE
                            $('#main .jobList li[job_id=' + job_id + ']').remove();
                            finalJobCount = parseInt($('.jobCount span').html()) - 1;
                            $('.jobCount span').html(finalJobCount);
                            loadJob("all");
            //loadJob("new");
                        }
                    }
            } else {
                spinOut();
                navigator.notification.alert(lang.Mobile056, function () {
                }, lang.Mobile055, 'OK');
                loadJob("all");
        //loadJob("new");
            }
        },
        error: function (error, errorText, errorThrown) {
            spinOut();
            rebindMainJobList();
            //console.log("checkstatus error: " + error.responseText + " errorText: " + errorText + " errorThrown: " + errorThrown);
            writeLogs("Error Check Job Status for Job Id : " + job_id + "Job Type : " + job_type_id + "\n Error response" + error + " errorText: " + errorText + " errorThrown: " + errorThrown );
            acceptWithoutNetwork();
//            navigator.notification.alert(lang.Mobile068, function () {
//            }, lang.Mobile055, 'OK');
        }
    });

    // CHX 20190807 allow attend job without signal
    function acceptWithoutNetwork()
    {
        spinIn();

        if (job_type_id == "1" || job_type_id == "3")
        { //if planned job or adhoc job
            if (job_status != "0")
            {
                spinOut();
                startJob();
                writeLogs("Starting Job Id : " + job_id + " Job Type : " + job_type_id);
            }
            else
            {
                spinOut();
                navigator.notification.alert(lang.Mobile056, function () {
                }, lang.Mobile055, 'OK');
                loadJob("all");
                //loadJob("new");
            }
        }
        else if (job_type_id == "2")
        { //if broadcast job
            spinOut();
            navigator.notification.alert(lang.Mobile068, function () {
                }, lang.Mobile055, 'OK');
        }
    }

    function startJob() {
        if (job_type_id == "1" && job_status != "12" && job_status != "2") { //job is a planned and is not received or scheduled
            spinIn();
            window.clearInterval(jobInterval);
            $.mobile.changePage("#form", {transition: "fade"});
            $('#form [data-role=header] h1').html(job_name);
            $('#form [data-role=header] h1').css("margin", "0 auto"); //yy
            resetFormOpener();
            openDividedForm(html_file);
        } else if (job_type_id == "2" && job_status != "5" && job_status != "12") { //job is a broadcast and is not accepted or received
            spinIn();
            window.clearInterval(jobInterval);
            $.mobile.changePage("#form", {transition: "fade"});
            $('#form [data-role=header] h1').html(job_name);
            $('#form [data-role=header] h1').css("margin", "0 auto"); //yy
            resetFormOpener();
            openDividedForm(html_file);
        } else if (job_type_id == "3" && job_status != "12") { //job is an adhoc and is acknowledged or is ongoing
            spinIn();
            window.clearInterval(jobInterval);
            $.mobile.changePage("#form", {transition: "fade"});
            $('#form [data-role=header] h1').html(job_name);
            $('#form [data-role=header] h1').css("margin", "0 auto"); //yy
            resetFormOpener();
            openDividedForm(html_file);
        } else if (job_type_id == "1" && (job_status == "12" || job_status == "2")) { //job is a planned but yet to start
            if(isBeaconJob) {
                confirmStartPlanned(2);
            } else {

                $('#yesnoTitle').html(lang.Mobile058);
                $('#yesnoText').html(lang.Mobile059);
                $('#yesBtn').unbind('click');
                $('#yesBtn').bind('click', function () {
                    closeYesNoPopup();
                    confirmStartPlanned(2);
                });
                $('#yesnopopup').show();

//                navigator.notification.confirm(
//                    lang.Mobile059,
//                    confirmStartPlanned,
//                    lang.Mobile058,
//                    ["✘", "OK"]
//                    );
            }
        } else if (job_type_id == "2" && job_status == "12") { //job is a new broadcast but yet to be accepted
            if  (isBeaconJob) {
                confirmAcceptBroadcast(2);
            } else {
                $('#yesnoTitle').html(lang.Mobile060);
                $('#yesnoText').html(lang.Mobile061);
                $('#yesBtn').unbind('click');
                $('#yesBtn').bind('click', function () {
                    closeYesNoPopup();
                    confirmAcceptBroadcast(2);
                });
                $('#yesnopopup').show();
//                navigator.notification.confirm(
//                    lang.Mobile061,
//                    confirmAcceptBroadcast,
//                    lang.Mobile060,
//                    ["✘", "OK"]
//                    );
            }

        } else if (job_type_id == "2" && job_status == "5") { //job is a accepted broadcast but yet to start
            if (isBeaconJob) {
                confirmStartPlanned(2);
            } else {
                $('#yesnoTitle').html(lang.Mobile062);
                $('#yesnoText').html(lang.Mobile063);
                $('#yesBtn').unbind('click');
                $('#yesBtn').bind('click', function () {
                    closeYesNoPopup();
                    confirmStartPlanned(2);
                });
                $('#yesnopopup').show();

//                navigator.notification.confirm(
//                    lang.Mobile063,
//                    confirmStartPlanned,
//                    lang.Mobile062,
//                    ["✘", "OK"]
//                    );
            }

        } else if (job_type_id == "3" && job_status == "12") { //job is an adhoc but yet to start
            if (isBeaconJob) {
                confirmStartPlanned(2);
            } else {
                $('#yesnoTitle').html(lang.Mobile064);
                $('#yesnoText').html(lang.Mobile065);
                $('#yesBtn').unbind('click');
                $('#yesBtn').bind('click', function () {
                    closeYesNoPopup();
                    confirmStartPlanned(2);
                });
                $('#yesnopopup').show();

//                navigator.notification.confirm(
//                    lang.Mobile065,
//                    confirmStartPlanned,
//                    lang.Mobile064,
//                    ["✘", "OK"]
//                    );
            }
        }
    }
}

function confirmStartPlanned(response) {
    if (response == 2) { //if Yes
        var startedStatus = "7";
        var job_id = window.sessionStorage["selected_id"];
        var html_file = window.sessionStorage["selected_file"];
        var job_name = window.sessionStorage["selected_name"];

        var now = new Date();
        var now = two(now.getDate()) + two(now.getMonth() + 1) + now.getFullYear() + two(now.getHours()) + two(now.getMinutes()) + two(now.getSeconds());

        spinIn();
        var asset_id = window.sessionStorage["assetId"];
        var statuschange_URL = databaseIP + "/Controller/mobile_controller.jsp?type=job&action=statusChange&jobScheduleIds=" + job_id
                                    + "&statusId=" + startedStatus + "&dateTime=" + now + "&assetId=" + asset_id;

        $.ajax({
            url: statuschange_URL,
            type: 'GET',
            timeout: 30000,
            success: function (data) {
                if (data.result) {
                    writeLogs("statusChange success: Started " + job_id + " status = " + startedStatus + " FileName " + html_file);
                    console.log("statuschange success: Started " + job_id);
                    console.log("statuschange statuschange_URL2: " + statuschange_URL);
                    window.clearInterval(jobInterval);
                    $.mobile.changePage("#form", {transition: "fade"});
                    $('#form [data-role=header] h1').html(job_name);
                    resetFormOpener();
                    openDividedForm(html_file);
                    //26Sep
                } else {
                    writeLogs("confirmStartPlanned,statuschange fail: result return fail, text:" + data.text)
                    //console.log("statuschange fail: result return fail, text:" + data.text);
                    navigator.notification.alert(lang.Mobile067, function () {
                    }, lang.Mobile066, 'OK');
                    spinOut();
                }
            },
            error: function (error, errorText, errorThrown) {
                spinOut();
                writeLogs("confirmStartPlanned, statuschange error: " + error + " errorText: " + errorText + " errorThrown: " + errorThrown)
                //console.log("statuschange error: " + error.responseText + " errorText: " + errorText + " errorThrown: " + errorThrown);
//                navigator.notification.alert(lang.Mobile068, function () {
//                }, lang.Mobile066, 'OK');
                newPendingStatus(job_id, startedStatus, now, '', asset_id);
                startPlannedWithoutNetwork(job_name, html_file, job_id);

            }
        });
    } else {
        rebindMainJobList();
    }
}

function startPlannedWithoutNetwork(job_name, html_file, job_id)
{
    //console.log("statuschange success: Started " + job_id);
    window.clearInterval(jobInterval);
    $.mobile.changePage("#form", {transition: "fade"});
    $('#form [data-role=header] h1').html(job_name);
    resetFormOpener();
    openDividedForm(html_file);
}

function confirmAcceptBroadcast(response) {
    if (response == 2) { //if Yes
        var job_id = window.sessionStorage["selected_id"];
        var html_file = window.sessionStorage["selected_file"];
        var job_name = window.sessionStorage["selected_name"];
        var user_id = window.sessionStorage["userID"];
        spinIn();
        var acceptbroadcastjob_URL = databaseIP + "/Controller/mobile_controller.jsp?type=job&action=acceptbroadcastjob&scheduleId=" + job_id + "&driver=" + user_id;
        $.ajax({
            url: acceptbroadcastjob_URL,
            type: 'GET',
            timeout: 30000,
            success: function (data) {
                writeLogs("confirmAcceptBroadcast, data.result " + data.result + " data.broadCastAcknowledge " + data.broadCastAcknowledge);
                if (data.result) {
                    if (data.broadCastAcknowledge == "1") {
                        console.log("acceptbroadcastjob success: Accepted " + job_id);
                        navigator.notification.alert(lang.Mobile070, function () {
                        }, lang.Mobile069, 'OK');
                        spinOut();
                        loadJob("all");
                    } else {
                        navigator.notification.alert(lang.Mobile072, function () {
                        }, lang.Mobile071, 'OK');
                        spinOut();
                        loadJob("all");
                    }
                } else {
                    console.log("acceptbroadcastjob fail: result return fail, text:" + data.text);
                    console.log(acceptbroadcastjob_URL);
                    navigator.notification.alert(lang.Mobile073, function () {
                    }, lang.Mobile071, 'OK');
                    spinOut();
                }
            },
            error: function (error, errorText, errorThrown) {
                console.log("acceptbroadcastjob error: " + error + " errorText: " + errorText + " errorThrown: " + errorThrown);
                navigator.notification.alert(lang.Mobile068, function () {
                }, lang.Mobile071, 'OK');
                spinOut();
            }
        });
    } else {
        rebindMainJobList();
    }
}


function confirmBackForm(response) {
    if (response == 2) { //if OK
        sessionStorage.removeItem('selected_id');
        sessionStorage.removeItem('selected_file');
        sessionStorage.removeItem('selected_name');
        spinIn();
        setTimeout(function () {
            $.mobile.changePage("#main", {transition: 'fade', reverse: 'true'});
            jobInterval = window.setInterval(function () {loadJob("all");}, refreshRate);
            loadJob("all");
        //loadJob("new");
            spinOut();
        }, 0);
    } //else do nothing
}



function confirmSubmit(response) {
    if (response == 2) { //if Yes
        console.log('Confirm submit');
        $('.ratingsSummary').attr("value",ratingsSummary()[1]);
        newSubmitForm(window.sessionStorage["selected_file"]);
        //26Sep
//        submitForm(window.sessionStorage["selected_file"]);
    } else {
        //else do nothing
    }
}



function encodeUnicode(theString) {
    var unicodeString = '';
    for (var i = 0; i < theString.length; i++) {
        var theUnicode = theString.charCodeAt(i).toString(16).toUpperCase();
        while (theUnicode.length < 4) {
            theUnicode = '0' + theUnicode;
        }
        theUnicode = '\\u' + theUnicode;
        unicodeString += theUnicode;
    }

    encodeString = window.btoa(unicodeString)
    return encodeString;
}


function takephoto(backupGallery) {
    var first = $picPointer.length - 1;
//    var options = {};
//    var networksArray = [];
    console.log('Debug image name');
    navigator.camera.getPicture(function (fileURI) {
        $picPointer.eq(first).attr("data-latitude", "0");
        $picPointer.eq(first).attr("data-longitude", "0");
        $picPointer.eq(first).attr("data-block-unit", "0");
        $picPointer.eq(first).attr("data-block-level", "1");
//        var textField = $('<input type="text" class="myTextField" placeholder="Enter text 123...">');
//        textField.insertAfter($picPointer.eq(first));

        //  JX 30/08/18: this part is exact copy from the gps tracking (getUserLocation).  Tested the below code WORKING
//        if(wifiAttribute === 1)
//        {
//            WifiWizard.isWifiEnabled(function(){ //depend weather this is needed, but it is working now.
//            WifiWizard.setWifiEnabled(true, function() {
//                    //console.log("Successfully enabled wifi in this device");
//                }, function() {
//                    //console.log("Failed to Enable Wifi in this device");
//                });
//            }, function() {
//                //console.log("Wifi Disabled");
//            });
//            WifiWizard.startScan(function(){console.log("success");}, function(){});  // seem like sometime it will get cached response instead if never put in this.
//            // https://developer.android.com/about/versions/oreo/background-location-limits
//
//            WifiWizard.getScanResults(options, function (networks) { //add block and level attribute based on wifi
//               networks.sort(sort_by('level', {})); // sort according to signal strength.
//               for(var i = networks.length - 3; i < networks.length; i ++) {
//                   if (i < 0){
//                       return false;
//                   }
//                   networksArray.push([networks[i]['BSSID'], networks[i]['level'], networks[i]['SSID']]);
//               }
//
//                // only return value when the wifi details are already in our database. ** SSID1 is the strongest signal strength with lowest negative rate.
//                var returnwifi_url = databaseIP + "/Controller/mobile_controller.jsp?type=hotspot&action=get&ssid1=" + encodeURIComponent(networksArray[2][0]) + "&ssid2=" + encodeURIComponent(networksArray[1][0]) +"&ssid3=" + encodeURIComponent(networksArray[0][0])
//                        + "&quality1=" + encodeURIComponent(networksArray[2][1]) + "&quality2=" + encodeURIComponent(networksArray[1][1]) +"&quality3=" + encodeURIComponent(networksArray[0][1]) + "&mode=0&name1="+ encodeURIComponent(networksArray[2][2])  + "&name2=" + encodeURIComponent(networksArray[1][2]) +"&name3=" + encodeURIComponent(networksArray[0][2]);
//                writeLogs(networksArray[2][0] + " q: " + networksArray[2][1] + " 2 " + networksArray[1][0] +  " q: " + networksArray[1][1] + " 3: " + networksArray[0][0] + " q: " + networksArray[0][1]);
//                //var testName = "name1 = " + testArray[2] + " " + networksArray[2][1] + " name2 = " + testArray[1] + " "+ networksArray[1][1] + " name3 " + testArray[0] + "  " + networksArray[0][1];
//
//                $.ajax({
//                    url: returnwifi_url,
//                    type: 'GET',
//                    success: function (data) {
//                        if (data.result) {
//                            if(data.data !== undefined){
//                                $picPointer.eq(first).attr("data-block-unit", data.data[0].location);
//                                $picPointer.eq(first).attr("data-block-level", data.data[0].Level);
//                            }
//                        }
//                    },
//                    error: function (error, errorText, errorThrown) {
//                        console.log("returnwifi error: " + error.responseText + " errorText: " + errorText + " errorThrown: " + errorThrown);
//                    }
//                });
//            }, function (error, errorText, errorThrown) {
//
//            });
//        }

        var hideImgDate = $picPointer.eq(first).parent().parent().attr("data-hideimagedate");

        if (typeof hideImgDate == 'undefined') { // if cannot find attr data-hideimagedate, display both date and time by default
            var now = getCurrentDateTime(1);
        } else {

            if (($picPointer.eq(first).parent().parent().attr("data-hideimagedate") == "true") && ($picPointer.eq(first).parent().parent().attr("data-hideimagetime") == "true")) { // hide both date and time
                var now = "";
            }
            else if (($picPointer.eq(first).parent().parent().attr("data-hideimagedate") == "true") && ($picPointer.eq(first).parent().parent().attr("data-hideimagetime") == "false")) { // hide date display time
                var now = getCurrentDateTime(2);
            }
            else if (($picPointer.eq(first).parent().parent().attr("data-hideimagedate") == "false") && ($picPointer.eq(first).parent().parent().attr("data-hideimagetime") == "true")) { // display date hide time
                var now = getCurrentDateTime(3);
            } else { // display both
                var now = getCurrentDateTime(1);
            }
        }
        $picPointer.eq(first).attr("data-timestamp", now);
        spinInPhoto(); // this is to prevent them from touch anything while photo is processing.
        var spinTimeout = setTimeout(function(){ spinOut();}, 10000); // incase it never spin out and hang there.

        if ($picPointer.eq(first).parent().parent().attr("data-geotag") == "false") {
            console.log("Geotag is false.");
            $picPointer.eq(first).attr("data-latitude", "0");
            $picPointer.eq(first).attr("data-longitude", "0");
            $picPointer.on({'click' : function () {
                if ($picPointer.attr('src') != "") {
                    $photoPreviewPointer = $(this);
                    console.log('photoPreview 1');
                    photoPreview($(this).attr('src'), $(this).attr('data-latitude'), $(this).attr('data-longitude'), $(this).attr('data-block-unit'), $(this).attr('data-block-level'), $(this));
                }
            } });
            textWatermark(fileURI, "", now, function (base64Img) { //watermark photo with timestamp
                console.log('textWatermark');
                $picPointer.eq(first).css('background-color', 'black');
                $picPointer.eq(first).attr('src', base64Img);
                spinOut();
                if (backupGallery) {
                    saveProcessedImage(base64Img);
                }
                if(typeof spinTimeout !== "undefined"){
                    clearTimeout(spinTimeout);
                }
                writeLogs("Camera Photo Successfully Loaded w/o GeoTag. PhotoBackup = " + backupGallery);
            }, null);
        }
        else
        {
            var geoOptions = {enableHighAccuracy: true, timeout: 10000};
            navigator.geolocation.getCurrentPosition(function (position) //add latlng attribute
            {
                if ($picPointer.eq(first).attr('src') == "img/loading.png") {
//                    clearTimeout(photolocation_timeout);
                    console.log("Get Photo LongLat success: latitude:" + position.coords.latitude + ", longtitude:" + position.coords.longitude);
                    $picPointer.eq(first).attr("data-latitude", position.coords.latitude);
                    $picPointer.eq(first).attr("data-longitude", position.coords.longitude);
                    $picPointer.on({'click' : function () {
                        if ($picPointer.attr('src') != "") {
                            $photoPreviewPointer = $(this);
                            console.log('=====> photoPreview before x3' + $(this).parent().html());
                            photoPreview($(this).attr('src'), $(this).attr('data-latitude'), $(this).attr('data-longitude'), $(this).attr('data-block-unit'), $(this).attr('data-block-level'), $(this));
                            console.log('=====> photoPreview after x3' + $(this).parent().html());
                        }
                    } });
//                    var staticmap = 'https://maps.googleapis.com/maps/api/staticmap?center=' + position.coords.latitude + ',' + position.coords.longitude + '&zoom=18&size=400x400&maptype=roadmap&markers=color:red%7C' + position.coords.latitude + ',' + position.coords.longitude;
                    var staticmap = 'http://www.v3nity.com:80/V3Nity4/googleapi?type=map&action=static&lat=' + position.coords.latitude + '&lon=' + position.coords.longitude + '&maptype=roadmap&zoom=18&width=400&height=400';
                    textWatermark(fileURI, staticmap, now, function (base64Img) { //watermark photo with timestamp
                        console.log('textWatermark %%%%%');
                        $picPointer.eq(first).css('background-color', 'black');
                        $picPointer.eq(first).attr('src', base64Img);
                        spinOut();
                        if (backupGallery) {
                            saveProcessedImage(base64Img);
                        }
                        if(typeof spinTimeout !== "undefined"){
                            clearTimeout(spinTimeout);
                        }
                        writeLogs("Camera Photo Successfully Loaded w GeoTag. PhotoBackup = " + backupGallery);
                    }, geoOptions);
                }
            }, function (error) {
                console.log("Get Photo LongLat Failed");
                navigator.notification.alert("Photo is saved without geotag. Please ensure you have enabled location info.", function () {
                    }, "Unable to Capture GPS", 'OK');
                $picPointer.eq(first).attr("data-latitude", "0");
                $picPointer.eq(first).attr("data-longitude", "0");
                $picPointer.on({'click' : function () {
                    if ($picPointer.attr('src') != "") {
                        $photoPreviewPointer = $(this);
                        photoPreview($(this).attr('src'), $(this).attr('data-latitude'), $(this).attr('data-longitude'), $(this).attr('data-block-unit'), $(this).attr('data-block-level'), $(this));

                    }
                } });
                textWatermark(fileURI, "", now, function (base64Img) { //watermark photo without timestamp
                    console.log('textWatermark ^^^^');
                    $picPointer.eq(first).css('background-color', 'black');
                    $picPointer.eq(first).attr('src', base64Img);
                    spinOut();
                    if (backupGallery) {
                        saveProcessedImage(base64Img);
                    }
                    if(typeof spinTimeout !== "undefined"){
                            clearTimeout(spinTimeout);
                    }
                    writeLogs("Camera Photo Successfully Loaded w/o GeoTag Failed. PhotoBackup = " + backupGallery + " Error for getCurrentPosition : " + error.code + " error message " + error.message );
                }, geoOptions);
            }, geoOptions);
        } // end of else, end of successhandler
    }, onPhotoFail, {
        correctOrientation: true,
        saveToPhotoAlbum: false,
        quality: 40,
        targetWidth: 400,
        targetHeight: 400,
        sourceType: pictureSource.CAMERA,
        destinationType: destinationType.FILE_URI
    });
}
function onPhotoFail(message) {
    spinOut();
    $picPointer.eq($picPointer.length - 1).remove();
    writeLogs("Camera Take Photo Cancelled / Failed : " + message);
    //console.log('Takephoto Failed: ' + message);
}

function attachImg() {
    console.log('Debug attach image');
    window.imagePicker.getPictures(function(results) {
        if (results.length < 1 ) { //remove the loading.png if no image selected
            $picPointer.eq($picPointer.length - 1).remove();
        }
        $picPo = $picPointer.parent().find('img');
        var first = $picPo.length - 1;
        var hideImgDate = $picPointer.eq(first).parent().parent().attr("data-hideimagedate");

        for (var i = 0; i < results.length; i++) {

            var geoOptions = {enableHighAccuracy: true, timeout: 10000};

            if (typeof hideImgDate == 'undefined') { // if cannot find attr data-hideimagedate, display both date and time by default
                var now = getCurrentDateTime(1);
            } else {

                if (($picPointer.eq(first).parent().parent().attr("data-hideimagedate") == "true") && ($picPointer.eq(first).parent().parent().attr("data-hideimagetime") == "true")) { // hide both date and time
                    var now = "";
                }
                else if (($picPointer.eq(first).parent().parent().attr("data-hideimagedate") == "true") && ($picPointer.eq(first).parent().parent().attr("data-hideimagetime") == "false")) { // hide date display time
                    var now = getCurrentDateTime(2);
                }
                else if (($picPointer.eq(first).parent().parent().attr("data-hideimagedate") == "false") && ($picPointer.eq(first).parent().parent().attr("data-hideimagetime") == "true")) { // display date hide time
                    var now = getCurrentDateTime(3);
                } else { // display both
                    var now = getCurrentDateTime(1);
                }
            }

            if (i>0) {
                console.log('if ****');
                (function(url) {
                    textWatermark(url, "", "", function (base64Img) { //watermark image with timestamp, still got issue with the index
                        var img = $('<img/>', {src:base64Img}).insertAfter($picPointer.parent().find('img').last());
//                        if (noOfImg > 0) {
//                            var img = $('<img/>', {src:base64Img}).insertAfter($picPointer.parent().find('img').last());
//                        } else {
//                            var img = $('<img/>', {src:base64Img}).insertBefore($picPointer.parent().find('input'));
//                        }
                        img.css('background-color', 'black');
                        img.attr("data-latitude", "0");
                        img.attr("data-longitude", "0");
                        img.attr("data-block-unit", "0");
                        img.attr("data-block-level", "0");
                        img.attr("data-timestamp", now);
                        img.on('click', function () {
                            if (img.attr('src') != "") {
                                $photoPreviewPointer = $(this);
                                photoPreview($(this).attr('src'), 0, 0, 0, 0, $(this));
                            }
                        });
                    }, geoOptions);
                })(results[i]);
            } else {
                console.log('else ***');
                $picPointer.eq(first).attr("data-latitude", "0");
                $picPointer.eq(first).attr("data-longitude", "0");
                $picPointer.eq(first).attr("data-block-unit", "0");
                $picPointer.eq(first).attr("data-block-level", "0");
                $picPointer.eq(first).attr("data-timestamp", now);
                textWatermark(results[i], "", "", function (base64Img) { //watermark image with timestamp
                    $picPointer.eq(first).css('background-color', 'black');
                    $picPointer.eq(first).attr('src', base64Img);
                    $picPointer.on({'click' : function () {
                    if ($picPointer.attr('src') != "") {
                        $photoPreviewPointer = $(this);
                        photoPreview($(this).attr('src'), $(this).attr('data-latitude'), $(this).attr('data-longitude'), $(this).attr('data-block-unit'), $(this).attr('data-block-level'), $(this));

                    }
                } });
                }, geoOptions);
            }
        }
    }, function (error) {

        console.log('Error: ' + error);
    }, {
        maximumImagesCount: $dataMax,
        quality: 100,
        height:400,
        width:800
    });
}


/**
 * Convert an image
 * to a base64 url
 * then add text watermark
 * @param  {String}   url
 * @param  {String}   url2 //used for 400x400px static map
 * @param  {String}   text
 * @param  {Function} callback
 * @param  {String}   [outputFormat=image/png]
 */
function textWatermark(url, url2, text, callback, outputFormat) {

    var img = new Image();
    img.crossOrigin = 'Anonymous';
    img.onload = function () {
       console.log('textWatermark');
        var canvas = document.createElement('CANVAS'),
                ctx = canvas.getContext('2d'), dataURL;
        if (url2 == "") {
            canvas.height = this.height;
            canvas.width = this.width;
            canvas.border = '1px solid black';
        } else {
            canvas.height = 400; //400px is the height of static map
            canvas.width = this.width + 400; //400px is the width of static map
        }
        ctx.drawImage(this, 0, 0);
        ctx.strokeStyle = "#FFFFFF";
        ctx.fillStyle = "#CE5908";
        ctx.lineWidth = 5;
        ctx.font = "normal 17px arial";
        ctx.strokeText(text, 5, 17);
        ctx.fillText(text, 5, 17);
        var initialwidth = this.width;
        if (url2 != "") {
            var img = new Image();
            img.crossOrigin = 'Anonymous';
            img.onload = function () {
                ctx.drawImage(this, initialwidth, 0);
                dataURL = canvas.toDataURL(outputFormat);
                callback(dataURL);
                canvas = null;
            };
            img.onerror = function ()
            {
                navigator.notification.alert("Photo is saved without geotag. Please ensure you have internet connection.", function () {
                    }, "Unable to Capture GPS", 'OK');
                dataURL = canvas.toDataURL(outputFormat);
                callback(dataURL);
                canvas = null;
            };
            img.src = url2;
        } else {
            dataURL = canvas.toDataURL(outputFormat);
            callback(dataURL);
            canvas = null;
        }
    };
    img.src = url;
}

function photoPreview(photo, latitude, longtitude, block_unit, block_level, element) {
    if (photo != "") {
        if (latitude == undefined) {
            latitude = "-";
        }
        if (longtitude == undefined) {
            longtitude = "-";
        }
        if (block_unit == undefined) {
            block_unit = "-";
        }
        if (block_level == undefined) {
            block_level = "-";
        }
        var photo_label = ""
        if (element !== undefined) {
            photo_label = element.attr("data-photo-label")
            photo_label = photo_label !== undefined ? photo_label : ""
            console.log("=====> photo_label: " + photo_label)
        }

        var viewportHeight = ($(window).height()-104) * 0.5; //worry that viewportHeight will fail, so put in max-height;

        // Update the HTML string with the enteredText variable
        var htmlString = "<div style='max-height:252px; width:100%; height:"  + viewportHeight + "px'><img id='photoPreview' src='" + photo + "' /></div><div>" +
            lang.Mobile080 + ": " + latitude + "," + longtitude + "<br>" +
//            lang.Mobile081 + ": " + block_unit + "<br>" +
//            lang.Mobile082 + ": " + block_level + "<br>" +
            "<input type='text' id='photoLabel' placeholder='Enter label...' value='" + photo_label + "'>" +
            "</div>";

        confirmPopupImages(htmlString, confirmPhoto, lang.Mobile079, ["OK", "✂"]);

          $('#photoLabel').on('change', function() {
            var updatedText = $(this).val();
                console.log("=====> updatedText: " + updatedText)
                console.log("=====> element: " + element)
                if (element !== undefined) {
                   element.attr("data-photo-label", updatedText);
                }
          });
    }
}



function confirmPhoto(response) {
    if (response == 2) { //if Yes
        $photoPreviewPointer.eq($photoPreviewPointer.length - 1).remove();
    } else {
        //else do nothing
    }
}

function move_handler(ev) {
    if (ev.originalEvent.targetTouches.length == 2 && ev.originalEvent.changedTouches.length == 2) {

    } else
    {
        $('#image img').css('transform', 'scale(1.5)');
        $('#image img').css({'transform-origin': ((ev.originalEvent.changedTouches[0].screenX - $('#image').offset().left) / $('#image').width()) * 100 + '% ' + ((ev.originalEvent.changedTouches[0].screenY - $('#image').position().top) / $('#image').height()) * 100 +'%'});
    }
}

function showImage(src) {
    console.log('DEBUG show image');
    var viewportHeight = ($(window).height()); //worry that viewportHeight will fail, so put in max-height;
    var viewportWidth = ($(window).width());
    $('#image img').first().attr('src', src).css('max-height', viewportHeight).css('max-width',viewportWidth );
    $('#image img').on('touchmove', move_handler);

    $('#imagepopup').popup();
    $('#imagepopup').popup("open");
    $('#imagepopup').on({//prevents background from scrolling when popup is up
        popupbeforeposition: function () {
            $('body').on('touchmove', false); // when you do this, it will preven the the background (the body) to stop moving. However, have this error when you see the google chrome log.
            $('#imagepopup').css('display', 'block');
        },
        popupafteropen: function (){

          $('#image img').on('click', function(){
            $('#imagepopup').popup('close');
            $('#image img').css('transform', 'scale(1)');
          });
        },
        popupafterclose: function () {
            $('body').off('touchmove');
            $('#imagepopup').css('display', 'none');
            $('#image img').css('transform', 'scale(1)');
        }
    });
}

function takesignature() {
    $('#signaturepopup').show(); //show signature editor
    if ($signPointer.attr('src') != 'img/signature.png') { //if previous signature exist
        $sigdiv.jSignature('setData', $signPointer.attr('src'));	//set previous signature on canvas
    } else {
        $sigdiv.jSignature('clear');
    }
    $('body').on('touchmove', function () {
        return false
    });
}

function confirmSign(response) {
    if (response == 2) { //if Yes
        $('body').off('touchmove');
        $signPointer.attr("src", $sigdiv.jSignature("getData", 'default'));
    } else {
        //else do nothing
        $('body').off('touchmove');
        $sigdiv.jSignature('clear');
        $signPointer.attr("src", "img/signature.png");
    }
}

function takedrawing() {
    $('#drawingpopup').show(); //show signature editor
    if ($signPointer.attr('src') != 'img/signature.png') { //if previous drawing exist
        $drawdiv.jSignature('setData', $signPointer.attr('src'));	//set previous drawing on canvas
    } else {
        $drawdiv.jSignature('clear');
    }
    $('body').on('touchmove', function () {
        return false
    });
}

function confirmDraw(response) {
    if (response == 2) { //if Yes
        $('body').off('touchmove');
        $signPointer.attr("src", $drawdiv.jSignature("getData", 'default')); // set canvas, set image url to drawing
    } else {
        //else do nothing
        $('body').off('touchmove');
        $drawdiv.jSignature('clear');
        $signPointer.attr("src", "img/signature.png");
    }
}

//function captureBarcode() {
//
//}

function confirmDeleteBarcode(response) {
    if (response == 2) { //if Yes
        var barcodearray = [];
        if ($barcodeEntryPointer.parent().attr('data-barcode') != "") {
            barcodearray = $barcodeEntryPointer.parent().attr('data-barcode').split(',');
        }
        barcodearray.splice($barcodeEntryPointer.index(), 1);
        $barcodeEntryPointer.parent().attr('data-barcode', barcodearray);
        $barcodeEntryPointer.remove();
    } else {
        //else do nothing
    }
}

//function openHintBox() { //comment away on v3.5.11
//    $(hint).toggle();
//}

function toggleCollapser(id, count) { // for collapser form field to use...

    // collapse all the collapsers except the one the user clicked on...
    $('.collapser.expand').each(function () {

        var div = $(this).parent();

        if (div.attr('id') !== id)
        {
            div.nextAll(':lt(' + div.attr('data-max') + ')').toggle();

            $(this).removeClass('expand');
        }
    });

    var collapser = $('#' + id);

    collapser.nextAll(':lt(' + count + ')').toggle();
    collapser.children(':first').toggleClass('expand');

    var collapserOffSet = collapser.offset().top - 50;
    $('html,body').animate({
        scrollTop: collapserOffSet
    });

}


function openDividedFormForUpload(file)
{
    console.log('fileName: ' + file + '-' + uploadingFilenameIndex);
    writeLogs("openDividedFormForUpload, fileName: " + file + "-" + uploadingFilenameIndex);
    jobBeingUploaded = file;

    appDirectory.getFile(file + '-' + uploadingFilenameIndex, {create: false}, function (fileEntry) {
        fileEntry.file(openSingleFileForUpload, openDividedFormForUploadUnusualFail);
    }, openFileUploadFail);
}

function openDividedFormForUploadUnusualFail(file, err)
{
    writeLogs("openDividedFormForUploadUnusualFail " + file + " err " + err.code + err.message)
    resetFormUploader();
    openDividedFormForUpload(file);
}

function openSingleFileForUpload(file) // this will loop through all the diff filenameindex to add to uploadedJobAllHtml
{
    var reader = new FileReader();
    reader.onloadend = function (evt) {
        uploadedJobAllHtml += evt.target.result;
        //console.log('--- UPLOAD LENGTH: ' + evt.target.result.length + ', TOTAL UPLOAD LENGTH: ' + uploadedJobAllHtml.length);
        writeLogs("--- UPLOAD LENGTH: " + evt.target.result.length + ", TOTAL UPLOAD LENGTH: " + uploadedJobAllHtml.length);
        uploadingFilenameIndex++;
        openDividedFormForUpload(jobBeingUploaded);
    };
    reader.readAsText(file);
}

function openFileUploadFail(err) // will come to here when there is no more file to read from.
{
    //console.log('Completed opening file series for upload: ' + jobBeingUploaded);
    console.log('Old code *********');
    var id = jobBeingUploaded.split("_")[0];
    console.log('jobBeingUploaded *********',jobBeingUploaded);
    var jobFileText = jobBeingUploaded;
    writeLogs("openFileUploadFail, Completed opening file series for upload: jobBeingUploaded " + jobBeingUploaded );
    var driver_id = window.sessionStorage["userID"];
    var asset_id = window.sessionStorage["assetId"];
    var version_no = localStorage.getItem("version");

    var endedStatus = "8";
    var details = Base64.encode(uploadedJobAllHtml);
    var JSONText = {};

    JSONText.job_id = parseInt(id);
    JSONText.driver_id = parseInt(driver_id);
    JSONText.asset_id = parseInt(asset_id); //xxxx
    JSONText.version_no = version_no;
    JSONText.status_id = parseInt(endedStatus);
    JSONText.details = details;
    JSONText = JSON.stringify(JSONText);

//    console.log(details)

    var upload_url = databaseIP + "/Controller/mobile_controller.jsp?type=job&action=upload&jobId=" + id + "&assetId=" + asset_id + "&detailsLength=" + details.length + "&driverId=" + driver_id;

    console.log('upload_url:',upload_url);
    console.log('Uploading ' + jobBeingUploaded);
//    console.log('upload_url: ' + upload_url);
//    console.log('JSONText: ' + JSONText);
//

    $.ajax({
        type: 'POST',
        url: upload_url,
        data: JSONText,
        contentType: "application/json",
        dataType: "json",
        cache: false,
        timeout: 300000, // 30000
        beforeSend: function (){
          writeLogs("openFileUploadFail, uploading file Name = " +  jobBeingUploaded);
        },
        success: function (data)
        {
            console.log('Uploading data result: ' + data.result);
            console.log("Result", JSON.stringify(data))
            if (data.result)
            {
                resetFormDeleter();
                newDeleteFile(jobFileText, 0);
                // TODO
                var tuploadQueue = [];
                console.log("X11");
                if (localStorage.getItem("uploadQueue") != "[]" && localStorage.getItem("uploadQueue") != null) {
                    tuploadQueue = JSON.parse(window.localStorage["uploadQueue"]).toString().split(",");
                }

                if(tuploadQueue[0] == jobFileText)  {
                    tuploadQueue.shift();
                }

                window.localStorage["uploadQueue"] = JSON.stringify(tuploadQueue);
               console.log("DEBUG10:",index)
                $('.uploadCount span').html(tuploadQueue.length); //update Upload count
                clearTimeout(uploadInterval); // not to have two instant of uploadInterval occuring at the same time, therefore, clear first before re-initatiate.
                uploadInterval = setTimeout(function () {
                    newUploadQueue();
                }, uploadDelay); //calls again after 30seconds
//
//                setTimeout(function () {
//                    newUploadQueue();
//                }, uploadDelay); //calls again after 30seconds
                writeLogs("openFileUploadFail, Successfully Upload Job to Server : " + data.result + " Job id " + id );
            }
            else
            {
                clearTimeout(uploadInterval);
                uploadInterval = setTimeout(function () {
                    newUploadQueue();
                }, uploadDelay);
                writeLogs("openFileUploadFail, Upload Job to Server Data Result False, Server Reject? Re-queue job for uploading : "  + data.result + "job_id = " + id );
                changeArraySequence();
            }
        },
        error: function (error, errorText, errorThrown) {
            //console.log("upload job error: " + error.responseText + " errorText: " + errorText + " errorThrown: " + errorThrown);
            writeLogs("openFileUploadFail, upload job error: " + error + " errorText: " + errorText + " errorThrown: " + errorThrown + " job_id " + id);
            clearTimeout(uploadInterval);
                uploadInterval = setTimeout(function () {
                    newUploadQueue();
                }, uploadDelay);
            changeArraySequence();
        }
    });
    function changeArraySequence(){
        var tuploadQueue = [];
        console.log("X12");
        if (localStorage.getItem("uploadQueue") != "[]" && localStorage.getItem("uploadQueue") != null) {
            tuploadQueue = JSON.parse(window.localStorage["uploadQueue"]).toString().split(",");
        }

        tuploadQueue.reverse();
        window.localStorage["uploadQueue"] = JSON.stringify(tuploadQueue);
        writeLogs("Changed UploadQueue Array Sequence. New array sequence = " + tuploadQueue);
        //console.log("CHANGED ARRAY SEQUENCE");
    }
}

/*** new file UPLOADER ***/

/*** new file OPENER ***/

function resetFormOpener()
{
    retrievingFilenameIndex = 0;
    jobBeingOpened = '';
    fileAllHtml = '';
}

function openDividedForm(file)
{
    console.log('fileName: ' + file + '-' + retrievingFilenameIndex);
    jobBeingOpened = file;

    appDirectory.getFile(file + '-' + retrievingFilenameIndex, {create: false}, function (fileEntry) {
        fileEntry.file(openSingleFile, openFileFail);
    }, openFileFail);
}

function openSingleFile(file)
{
    var reader = new FileReader();
    reader.onloadend = function (evt) {
        fileAllHtml += evt.target.result;
        console.log('--- LENGTH: ' + evt.target.result.length + ', TOTAL LENGTH: ' + fileAllHtml.length);
        retrievingFilenameIndex++;
        openDividedForm(jobBeingOpened);
    };
    reader.readAsText(file);
}

function openFileFail(err) // this is after openDividedForm(), when user open a new form
{
    console.log('Completed opening file series: ' + jobBeingOpened);

    $("#form_content").html(fileAllHtml);

    $('.image img').on('click',function()
    {
        var srcSource = $(this).attr('src');
        showImage(srcSource);
    });
    // Added 21 Aug
    $('.camera img').on({'click' : function () {
        console.log('Camera on click');
        if ($('.camera img').attr('src') != "") {
            $photoPreviewPointer = $(this);
            photoPreview($(this).attr('src'), $(this).attr('data-latitude'), $(this).attr('data-longitude'), $(this).attr('data-block-unit'), $(this).attr('data-block-level'), $(this));

        }
    } });
        bindCameraImg('.camera input[type="image"]');

    bindGalleryImg('.gallery input[type="image"]');
    $('.gallery img').on('click', function () {
        if ($('.gallery img').attr('src') != "") {
            $photoPreviewPointer = $(this);
            photoPreview($(this).attr('src'), 0, 0, 0, 0, $(this));
        }
    });
    /* End of Gallery Form Field */

    /* Start of Gallery & Camera Form Field */
    bindCameraImg('.cameralibrary input[type="image"][src$="camera.png"]');
    bindGalleryImg('.cameralibrary input[type="image"][src$="gallery.png"]');
    $('.cameralibrary img').on('click', function () {
        if ($('.cameralibrary img').attr('src') != "") {
            $photoPreviewPointer = $(this);
            photoPreview($(this).attr('src'), 0, 0, 0, 0, $(this));
        }
    });
    /* End of Gallery & Camera Form Field */



    if ($('.signature img').attr('src') == 'img/form_signature.png' || $('.signature img').attr('src') == '../img/form_signature.png'  ) { // v3 format = ../img/form_signature.png v4 format = img/form_signature.png
        $('.signature img').attr('src', 'img/signature.png');
    }
    $('.signature img').on('click', function () {
        $signPointer = $(this);
        takesignature();
    });

    if ($('.drawing img').attr('src') == 'img/form_signature.png' || $('.drawing img').attr('src') == '../img/form_signature.png' ) {
        $('.drawing img').attr('src', 'img/signature.png');
    } else {
        $signPointer = $(this);
    }
    $('.drawing img').on('click', function () {
        $signPointer = $(this);
        takedrawing();
    });

    $('.barcode input[type="image"]').attr('src', 'img/barcode.png');
    $('.barcode input[type="image"]').on('click', function ()
    {
        $barcodeListPointer = $(this).parent().find('ul');
        if ($barcodeListPointer.parent().find('input[type="text"]').val() == "")
        { //if barcode not manually entered
            if ($barcodeListPointer.attr('data-barcode').split(',').length < $barcodeListPointer.parent().attr("data-max") || $barcodeListPointer.parent().attr("data-max") == undefined) { //if still within max limit
                cordova.plugins.barcodeScanner.scan(
                        function (result) {
                            if (result.text != "") {
                                var newbarcode = result.text;
                                var barcodearray = [];
                                if ($barcodeListPointer.attr('data-barcode') != "") {
                                    barcodearray = $barcodeListPointer.attr('data-barcode').split(',');
                                }
                                barcodearray.push(newbarcode);
                                $barcodeListPointer.attr('data-barcode', barcodearray);
                                $barcodeListPointer.append('<li>' + newbarcode + '</li>');
                                $barcodeListPointer.parent().find('input[type="text"]').val("");

                                $barcodeListPointer.find('li').unbind('click');
                                $barcodeListPointer.find('li').bind('click', function () {
                                    $barcodeEntryPointer = $(this);

                                    $('#yesnoTitle').html(lang.Mobile089);
                                    $('#yesnoText').html(lang.Mobile090 + ": " + $barcodeEntryPointer.text() + "?");
                                    $('#yesBtn').unbind('click');
                                    $('#yesBtn').bind('click', function () {
                                        closeYesNoPopup();
                                        confirmDeleteBarcode(2);
                                    });
                                    $('#yesnopopup').show();

//                                    navigator.notification.confirm(
//                                            lang.Mobile090 + ": " + $barcodeEntryPointer.text() + "?",
//                                            confirmDeleteBarcode,
//                                            lang.Mobile089,
//                                            ["✘", "OK"]
//                                            );
                                });
                            } else {
                                $barcodeListPointer.parent().find('input[type="text"]').val("");
                            }
                        },
                        function (error) {
                            console.log("barcodescan error: " + error);
                        }
                );


            } else {
                $barcodeListPointer.parent().find('input[type="text"]').val("");
                navigator.notification.alert(lang.Mobile088, function () {
                }, lang.Mobile087, 'OK');
            }
        }
        else
        {
            var newbarcode = $barcodeListPointer.parent().find('input[type="text"]').val();
            var barcodearray = [];
            if ($barcodeListPointer.attr('data-barcode') != "" && $barcodeListPointer.attr('data-barcode') != undefined) {
                barcodearray = $barcodeListPointer.attr('data-barcode').split(',');
            }
            barcodearray.push(newbarcode);
            $barcodeListPointer.attr('data-barcode', barcodearray);
            $barcodeListPointer.append('<li>' + newbarcode + '</li>');
            $barcodeListPointer.parent().find('input[type="text"]').val("");

            $barcodeListPointer.find('li').unbind('click');
            $barcodeListPointer.find('li').bind('click', function () {
                $barcodeEntryPointer = $(this);

                $('#yesnoTitle').html(lang.Mobile089);
                $('#yesnoText').html(lang.Mobile090 + ": " + $barcodeEntryPointer.text() + "?");
                $('#yesBtn').unbind('click');
                $('#yesBtn').bind('click', function () {
                    closeYesNoPopup();
                    confirmDeleteBarcode(2);
                });
                $('#yesnopopup').show();

//                navigator.notification.confirm(
//                        lang.Mobile090 + ": " + $barcodeEntryPointer.text() + "?",
//                        confirmDeleteBarcode,
//                        lang.Mobile089,
//                        ["✘", "OK"]
//                        );
            });
        }
        ;
    });

    $('#ratingsSum').on('click', function () {
        var arr = ratingsSummary();
        arr[1] = arr[1] ? arr[1] : 0;
        $('#ratingsSum').attr('value', arr[1]);
        navigator.notification.alert("Grand Total: " + arr[0] + "\nTotal Percentage: " + arr[1] + " %", function () {
        }, "", 'OK');
    });

    $('.addCameraButton').on('click', function (){ // new function add Camera
        var additionalCameraCounter = 0;
        var dataMaxAdd = $(this).parent().attr('data-maxadd');

        $(this).parent().parent().prevAll().each(function() {
           if (typeof $(this).attr('data-addedcamera') !== typeof undefined && $(this).attr('data-addedcamera') !== false){
               additionalCameraCounter = additionalCameraCounter + 1;
           } else {
               return false;
           }
        });

        if (additionalCameraCounter < dataMaxAdd) {
            var idCounter = 0;
            var cameraSelector = $(this).parent().parent();
            $('.form-sheet').children().each(function() {
                var id = $(this).attr('id');
                idCounter = Math.max(idCounter, id.split('-')[2]);
            });
            if (idCounter == 0) {
                navigator.notification.alert("Dynamic Camera not added, please screenshot and contact Admin", function () { // just in case the counting doesnt work.
                }, lang.Mobile102, 'OK');
                return;
            }
            var sequenceNumber = 0;
            var checkPrev = $(this).parent().parent().prev();
            if (checkPrev.attr('data-addedcamera') === 'true') {

                var getPrevFormFieldText = checkPrev.children().first().text();
                var getLastDigits = getPrevFormFieldText.substring(getPrevFormFieldText.lastIndexOf(' '));
                sequenceNumber = parseInt(getLastDigits) + 1;
            } else {
                sequenceNumber = 1;
            }

            idCounter = idCounter + 1
            var idAttr = $(this).parent().parent().attr('id');
            var clonedCamera = $(this).parent().parent().clone(true).attr('id', (idAttr.replace(idAttr.match(/\d+/g), idCounter))); // change the form field id
            clonedCamera.attr('data-role', 'camera');
            clonedCamera.attr('data-addedcamera', true); //add new attribute to identify this is dynamic added
            var initialText = clonedCamera.children().first().text();
            clonedCamera.children().first().text(initialText + " " + sequenceNumber);
            clonedCamera.children('[id]').each(function () { // change the id form field id for all the label in the form field
                var idAttrChild = $(this).attr('id');
                $(this).attr('id', (idAttrChild.replace(idAttr.match(/\d+/g), idCounter)));
            });
            clonedCamera.find('.addcamera').empty();
            var image = $('<input/>', {type: 'image', src: 'img/camera.png'});
            clonedCamera.find('.addcamera').append(image); // find the the inner div. with class addcamera
            clonedCamera.children().last().attr('class','camera');
            clonedCamera.insertBefore(cameraSelector);
            bindCameraImg(clonedCamera.find('input'));
        } else { // when the
            navigator.notification.alert("You have reached the limit of adding Dynamic Camera ", function () {
            }, "Maximum Limit", 'OK');
        }
    });

    spinOut();
}

function bindCameraImg(attrSelector) {
    $(attrSelector).attr('src', 'img/camera.png');
    console.log('Debug bindCameraImg');
    $(attrSelector).on({'touchstart': function (event)  // this is to bind the camera icon
    {
        writeLogs("Initial Camera function");
        spinIn();
        setTimeout(function(){ spinOut();}, 5000); // incase it never spin out and hang there.

        $(this).before('<img src="img/loading.png" />');
        $picPointer = $(this).parent().find('img');
        if ($picPointer.length < $(this).parent().attr('data-max'))
        {

            if ($(this).parent().parent().attr("data-backup") == "true") {
                //takephotoBackup();
                console.log('Debug takephotoBackup');
                takephoto(true);
            } else {
                console.log('Debug takephoto false');
                takephoto(false);
            }

        }
        else if ($picPointer.length == $(this).parent().attr('data-max'))
        {
            console.log('else if loop');
            if ($(this).parent().parent().attr("data-backup") == "true") {
                //takephotoBackup();
                console.log('Debug takephoto true');
                takephoto(true);
            } else {
                console.log('Debug takephoto false ');
                takephoto(false);
            }
            // $(this).hide();
        }
        else if ($(this).parent().attr('data-max') == undefined)
        { //if data-max was not defined
            if ($(this).parent().parent().attr("data-backup") == "true") {
                //takephotoBackup();
                 takephoto(true);
            } else {
                takephoto();
            }
        }
        else
        {
            $picPointer.eq($picPointer.length - 1).remove();
            spinOut();
            navigator.notification.alert(lang.Mobile084, function () {
            }, lang.Mobile083, 'OK');
        }
        console.log('Photo captured.');
//         var textField = $('<input type="text" class="myTextField" placeholder="Enter text...">');
//                    textField.insertAfter($(this));
    } });
}

function bindGalleryImg(attrSelector){
    $(attrSelector).attr('src', 'img/gallery.png');
    $(attrSelector).on('click', function () {
        if (attrSelector.indexOf("cameralibrary") != -1 ) {
            $(this).prev().before('<img src="img/loading.png" />');
        } else {
            $(this).before('<img src="img/loading.png" />');
        }
        $picPointer = $(this).parent().find('img');
        $dataMax = $(this).parent().attr('data-max') - $picPointer.length + 1; // add plus 1 is because of the img/loading.png that will be remove
        if ($picPointer.length < $(this).parent().attr('data-max')) {
            attachImg();
        } else if ($picPointer.length == $(this).parent().attr('data-max')) {
            attachImg();
        } else if ($(this).parent().attr('data-max') == undefined) { //if data-max was not defined
            attachImg();
        } else {
            $picPointer.eq($picPointer.length - 1).remove();
            navigator.notification.alert(lang.Mobile086, function () {
            }, lang.Mobile085, 'OK');
        }
    });
}



/*** new file OPENER ***/
function resetFormSaver()
{
    savingFilenameIndex = 0;
    nextChunkStartPoint = 0;
    savedContent = '';
    jobBeingSaved = '';

    isAutoSave = false;
    isNewForm = false;
    newFormData = '';
    isSavingBeforeQueued = false;
}

function newSaveForm(html_file, data)
{
    appDirectory.getFile(html_file, {create: true, exclusive: false}, function (fileEntry) {
        fileEntry.createWriter(win, fail);
    }, fail);
    function win(writer)
    {
        writer.onwriteend = function (evt)
        {
            newSaveDividedForm(jobBeingSaved, isAutoSave, isNewForm, newFormData, isSavingBeforeQueued);
        };
        writer.write(data);
    };
    function fail(error) {
        //console.log("Writer Error: " + error.code);
        writeLogs("newSaveForm, Writer Error: " + error.code + error.message);
        spinOut();
        navigator.notification.alert(lang.Mobile094, function () {
        }, lang.Mobile093, 'OK');
    }
}

function resetFormDeleter()
{
    deletingFilenameIndex = 0;
}


function newDeleteFile(html_file, startIndex)
{
    var nextIndex = deletingFilenameIndex + parseInt(startIndex,10);

    //console.log('Deleting file ' + html_file + '-' + nextIndex);
    writeLogs("Deleting file " + html_file + "-" + nextIndex);

    appDirectory.getFile(html_file + '-' + nextIndex, {create: false},
        function (fileEntry)
        {
            fileEntry.remove(function ()
            {
                //console.log("Deleted: " + html_file + '-' + nextIndex);
                writeLogs("Deleted: " + html_file + '-' + nextIndex);
                deletingFilenameIndex++;
                newDeleteFile(html_file, startIndex);
            }, function (err) {
                //console.log('Finished deleting remaining file series: ' + html_file + ' after index ' + nextIndex);
                writeLogs("newDeleteFile, Finished deleting remaining file series: "+ html_file + " after index " + nextIndex + " error " + err.code + err.message);
                deletingFilenameIndex++;
            });

        },
        function (err)
        {
            //console.log('Finished deleting remaining file series: ' + html_file + ' after index ' + nextIndex);
            writeLogs("newDeleteFile, Cant get remaining file series: "+ html_file + " after index " + nextIndex + " error " + err.code + err.message);
            deletingFilenameIndex++;
        }
    );
}
/*** params for new file SAVER, OPENER, DELETER ***/

var multiplier = 800000;
var formDividerLimit = 5000000; // 5 000 000
var retrievingFilenameIndex = 0;
var jobBeingOpened = '';
var fileAllHtml = '';

var savingFilenameIndex = 0;
var nextChunkStartPoint = 0;
var savedContent = '';
var jobBeingSaved = '';
var isAutoSave = false;
var isNewForm = false;
var newFormData = '';
var isSavingBeforeQueued = false;

var deletingFilenameIndex = 0;

var uploadingFilenameIndex = 0;
var jobBeingUploaded = '';
var uploadedJobAllHtml = '';

/*** params for new file SAVER, OPENER, DELETER ***/

function resetFormUploader()
{
    uploadingFilenameIndex = 0;
    jobBeingUploaded = '';
    uploadedJobAllHtml = '';
}


function newUploadQueue()
{
    //console.log("Checking uploadQueue for files.");
    writeLogs("newUploadQueue, checking Uploadqueue for files" + localStorage.getItem("uploadQueue"));
    console.log("uploadQueue count:",localStorage.getItem("uploadQueue"));
    console.log("X13");
    if (localStorage.getItem("uploadQueue") != [""] && localStorage.getItem("uploadQueue") != null)
    {
        var tuploadQueue = [];
        tuploadQueue = JSON.parse(window.localStorage["uploadQueue"]).toString().split(",");
       // TODO console.log (JSON.parse(window.localStorage["uploadQueue"]))
       console.log ("UploadQueue :::",(window.localStorage["uploadQueue"]));
        var html_file = tuploadQueue[0];

        if (html_file != "")
        {
            resetFormUploader();
            openDividedFormForUpload(html_file);
            writeLogs("newUploadQueue, openDividedFormforUpload file = " + html_file);
        }
        else
        {
            //console.log("uploadqueue: Empty html_file id. Removed and updated uploadQueue.");
            writeLogs("uploadqueue: Empty html_file id. Removed and updated uploadQueue.");
            // TODO uncommented this part for fixing stuck upload , need to investigate more on this
            tuploadQueue.shift();
            window.localStorage["uploadQueue"] = JSON.stringify(tuploadQueue);
            console.log("HTML File empty...");
            $('.uploadCount span').html(tuploadQueue.length); //update Upload count
            clearTimeout(uploadInterval);
            uploadInterval = setTimeout(function () {
                newUploadQueue();
            }, uploadDelay);
        }
    }
    else
    {
        console.log("No more files to upload.");
    }
}


function newDownload(html_file, details)
{
    appDirectory.getFile(html_file + '-0', {create: false}, function (fileEntry)
    {
        fileEntry.file(winCheck, failCheck); //file: Creates a File object containing file properties.

        function winCheck(file)
        {
            if (file.size == 0)
            {
                resetFormSaver();
                newSaveDividedForm(html_file, true, true, details, false);
//                appDirectory.getFile(html_file, {create: true, exclusive: false}, function (fileEntry) {
//                    fileEntry.createWriter(winWriter, failWriter);
//                }, failWriter);
            }
            else
            {
                console.log("File Series exist: " + html_file);
            }
        }
        function failCheck(error)
        {
            writeLogs("newDownload, failcheck funciton, if fail to create a file, go back into the loop again and try to create. Might cause inifinite loop.")
            newDownload(html_file, details);
        }
    }, function () {
        uploadDirectory.getFile(html_file + '-0', {create: false}, function (fileEntry) {
            //PENDING - handling of UPLOAD DIRECTORY
            console.log("File Exist In Upload Queue: " + html_file);
        }, function () {
            console.log("Create new: " + html_file);
            resetFormSaver();
            newSaveDividedForm(html_file, true, true, details, false);
//            appDirectory.getFile(html_file, {create: true, exclusive: false}, function (fileEntry) {
//                fileEntry.createWriter(winWriter, failWriter);
//            }, failWriter);
        });
    });

    count++;
}

/* Start of Code for Submit Button Click */

function newSubmitForm(html_file) {
    spinIn();
    var empty = 0; //count unfilled mandatory questions

    $('input[type="text"]').each(function () {
        if ($(this).attr("required") && $(this).val() == "") {
            empty++;
            $(this).parent().css("background-color", "pink");
        } else {
            $(this).attr("value", $(this).val());
            $(this).parent().css("background-color", "inherit");
        }
    });
    $('input[type="date"]').each(function () {
        if ($(this).attr("required") && $(this).val() == "") {
            empty++;
            $(this).parent().css("background-color", "pink");
        } else {
            $(this).attr("value", $(this).val());
            $(this).parent().css("background-color", "inherit");
        }
    });
    $('input[type="time"]').each(function () {
        if ($(this).attr("required") && $(this).val() == "") {
            empty++;
            $(this).parent().css("background-color", "pink");
        } else {
            $(this).attr("value", $(this).val());
            $(this).parent().css("background-color", "inherit");
        }
    });
    $('input[type="email"]').each(function () {
        if ($(this).attr("required") && $(this).val() == "") {
            empty++;
            $(this).parent().css("background-color", "pink");
        } else {
            $(this).attr("value", $(this).val());
            $(this).parent().css("background-color", "inherit");
        }
    });
    $('input[type="datetime-local"]').each(function () {
        if ($(this).attr("required") && $(this).val() == "") {
            empty++;
            $(this).parent().css("background-color", "pink");
        } else {
            $(this).attr("value", $(this).val());
            $(this).parent().css("background-color", "inherit");
        }
    });
    $('input[type="number"]').each(function () {
        if ($(this).attr("required") && $(this).val() == "") {
            empty++;
            $(this).parent().css("background-color", "pink");
        } else {
            $(this).attr("value", $(this).val());
            $(this).parent().css("background-color", "inherit");
        }
    });
    $('textarea').each(function () {
        if ($(this).attr("required") && $(this).val() == "") {
            empty++;
            $(this).parent().css("background-color", "pink");
        } else {
            $(this).html($(this).val());
            $(this).parent().css("background-color", "inherit");
        }
    });
    $('select').each(function () {
        if ($(this).attr("required") && $(this).val() == "") {
            empty++;
            $(this).parent().css("background-color", "pink");
        } else {
            $(this).find('option[value!="' + $(this).val() + '"]').attr("selected", false);
            $(this).find('option[value="' + $(this).val() + '"]').attr("selected", true);
            $(this).parent().css("background-color", "inherit");
        }
    });
    $('fieldset').each(function () {
        var checkMandatory =  $(this).parent().parent().children().first().hasClass('mandatory');
        if ($(this).find('input[type="radio"]').val() != undefined) { //if radio
            if ($(this).parent().hasClass('ratings')) { // the following is for rating
                var emptyRating = 0;
                $(this).children().each(function () {
                    if ($(this).find('input[type="radio"]:checked').val() == undefined && checkMandatory ) {
                        empty++;
                        emptyRating++;
                        $(this).children().first().css("background-color", "pink");
                    } else {
                        $(this).find('input[type="radio"]:checked').attr("checked", true);
                        $(this).find('input[type="radio"]:not(:checked)').removeAttr("checked");
                        $(this).children().first().css("background-color", "inherit");
                    }
                });
                if (emptyRating != 0) {
                        $(this).parent().parent().children().first().css("background-color", "pink");
                } else {
                        $(this).parent().parent().children().first().css("background-color", "inherit");
                }
            } else { // the following is for radio button
                if ($(this).find('input[type="radio"]:checked').val() == undefined && checkMandatory) {
                    empty++;
                    $(this).parent().parent().children().first().css("background-color", "pink");
                } else {
                    $(this).find('input[type="radio"]:checked').attr("checked", true);
                    $(this).find('input[type="radio"]:not(:checked)').removeAttr("checked");
                    $(this).parent().parent().children().first().css("background-color", "inherit");
                }
            }

        } else if ($(this).find('input[type="checkbox"]').val() != undefined) { //if checkbox
            if ($(this).attr("required") && $(this).find('input[type="checkbox"]:checked').val() == undefined) {
                empty++;
                $(this).parent().css("background-color", "pink");
            } else {
                $(this).find('input[type="checkbox"]:checked').attr("checked", true);
                $(this).find('input[type="checkbox"]:not(:checked)').removeAttr("checked");
                $(this).parent().css("background-color", "inherit");
            }
        }
    });

    $('.camera').each(function () {
        if ($(this).find('img').length  < $(this).attr('data-min'))
        {
            empty++;
            $(this).parent().children().first().css("background-color", "pink");
        } else
        {
            $(this).parent().children().first().css("background-color", "inherit");
            $(this).find('img').each(function() {
                var imgLength = $(this).attr('src').length;
                if (imgLength < 1000){
                    empty++;
                    $(this).parent().parent().children().first().css("background-color", "pink");
                    return false;
                } else {
                    $(this).parent().parent().children().first().css("background-color", "inherit");
                }
            });
        }
    });
    $('.cameralibrary').each(function () {
        if ($(this).find('img').length  < $(this).attr('data-min'))
        {
            empty++;
            $(this).parent().children().first().css("background-color", "pink");
        } else
        {
            $(this).parent().children().first().css("background-color", "inherit");
            $(this).find('img').each(function() {
                var imgLength = $(this).attr('src').length;
                if (imgLength < 1000){
                    empty++;
                    $(this).parent().parent().children().first().css("background-color", "pink");
                    return false;
                } else {
                    $(this).parent().parent().children().first().css("background-color", "inherit");
                }
            });
        }
    });
    $('.gallery').each(function () {
        if ($(this).find('img').length < $(this).attr('data-min'))
        {
            empty++;
            $(this).parent().children().first().css("background-color", "pink");
        } else {
            $(this).parent().children().first().css("background-color", "inherit");
        }
    });
    $('.video').each(function () {
        if ($(this).attr("required") && $(this).find('.videoArea').html() == "") {
            empty++;
            $(this).parent().css("background-color", "pink");
        } else {
            $(this).parent().css("background-color", "inherit");
        }
    });

    $('.signature').each(function () {
        if ($(this).parent().children().first().hasClass('mandatory') && $(this).find('img').attr('src') == "img/signature.png") {
            empty++;
            $(this).parent().children().first().css("background-color", "pink");
        } else {
            $(this).parent().children().first().css("background-color", "inherit");
        }
    });

    $('.drawing').each(function () {
        if ($(this).parent().children().first().hasClass('mandatory') && $(this).find('img').attr('src') == "img/signature.png") {
            empty++;
            $(this).parent().children().first().css("background-color", "pink");
        } else {
            $(this).parent().children().first().css("background-color", "inherit");
        }
    });

    $('.barcode').each(function () {
        if ($(this).attr("required") && $(this).find('ul').attr('data-barcode') == "" && $(this).find('ul').attr('data-barcode').split(',').length <= $(this).attr("data-min")) {
            empty++;
            $(this).parent().css("background-color", "pink");
        } else {
            $(this).parent().css("background-color", "inherit");
        }
    });

    if (empty == 0) {
        var job_id = window.sessionStorage["selected_id"];
        var checkstatus_URL = databaseIP + "/Controller/mobile_controller.jsp?type=job&action=checkStatus&jobScheduleIds=" + job_id;
        console.log('checkstatus_URL',checkstatus_URL);
        writeLogs("Check Job Status before Submitting form. Job Id : " + job_id);
        $.ajax({
            url: checkstatus_URL,
            type: 'GET',
            success: function (data) {
                writeLogs("newSubmitForm, check status data result = " +  data.result + " job_status : " + data.arrStatus + " job id : " + data.arrJobId);
                if (data.result) {
                    var job_status = data.arrStatus;
                    var job_fullid = data.arrJobId;
                    console.log("checkstatus_URL " + checkstatus_URL);
                    console.log("beforesubmitcheckstatus success: " + job_status);
                    if (job_status == 0 || job_status == 8) { //job deleted or ended
                        resetFormDeleter();
                        newDeleteFile(html_file, 0);
                        sessionStorage.removeItem('selected_id');
                        sessionStorage.removeItem('selected_file');
                        sessionStorage.removeItem('selected_name');
                        setTimeout(function () {
                            $.mobile.changePage("#main", {transition: 'fade', reverse: 'true'});
                            jobInterval = window.setInterval(function () {
                                    loadJob("all");
                                }, refreshRate);
                            loadJob("all");
                            spinOut();
                            navigator.notification.alert(lang.Mobile098 + ' ' + job_fullid + ' ' + lang.Mobile099, function () {
                            }, lang.Mobile095, 'OK');
                        }, 0);
                    } else if (job_status == 11) { //job cancelled
                        resetFormDeleter();
                        newDeleteFile(html_file, 0);
                        sessionStorage.removeItem('selected_id');
                        sessionStorage.removeItem('selected_file');
                        sessionStorage.removeItem('selected_name');
                        setTimeout(function () {
                            $.mobile.changePage("#main", {transition: 'fade', reverse: 'true'});
                            jobInterval = window.setInterval(function () {
                                    loadJob("all");
                                }, refreshRate);
                            loadJob("all");
                            spinOut();
                            navigator.notification.alert(lang.Mobile098 + ' ' + job_fullid + ' ' + lang.Mobile100, function () {
                            }, lang.Mobile095, 'OK');
                        }, 0);
                    } else { //nothing wrong
                        resetFormSaver();
                        newSaveDividedForm(html_file, true, false, '', true);
                    }
                } else {
                    // What can cause Ajax to fail? Not sure why if ajax return false, the action is to do delete
                    // maybe can change here to auto save manually and prompt a different message
                    writeLogs("newsubmitform, Checking of Job Status Ajax return false and save the job. jobStatus " + job_status + " job Id " + job_fullid);

                    resetFormDeleter();
                    newDeleteFile(html_file, 0); // why delete job here?

                    sessionStorage.removeItem('selected_id');
                    sessionStorage.removeItem('selected_file');
                    sessionStorage.removeItem('selected_name');
//                    navigator.notification.alert(lang.Mobile123, function () { // write as Job Id + ? + no longer exist. Submit Job Failed
//                        resetFormSaver();
//                        newSaveDividedForm(window.sessionStorage["selected_file"], false, false, '', false);
//                        }, lang.Mobile095, 'OK');
                    setTimeout(function () {
                        $.mobile.changePage("#main", {transition: 'fade', reverse: 'true'});
                        jobInterval = window.setInterval(function () {
                                    loadJob("all");
                                }, refreshRate);
                        loadJob("all");
                        spinOut();
                        navigator.notification.alert(lang.Mobile098 + " " + lang.Mobile099, function () { // write as Job Id + ? + no longer exist. Submit Job Failed
                        }, lang.Mobile095, 'OK');
                    }, 0);
                }
            },
            timeout: 60000, //1minutes
            error: function (error, errorText, errorThrown) {
                spinOut();
                //console.log("beforesubmitcheckstatus error: " + error.responseText + " errorText: " + errorText + " errorThrown: " + errorThrown);
                writeLogs("beforesubmitcheckstatus error: " + error + " errorText: " + errorText + " errorThrown: " + errorThrown);
//                navigator.notification.alert(lang.Mobile101, function () {
//                }, lang.Mobile095, 'OK');
                endPlannedWithoutNetwork(html_file, job_id);
            }
        });

    } else {
        spinOut();
        navigator.notification.alert(empty + " " + lang.Mobile103, function () {
        }, lang.Mobile102, 'OK');
    }
}


function endPlannedWithoutNetwork(html_file, job_id)
{
    resetFormSaver();
    newSaveDividedForm(html_file, true, false, '', true);
}
/* End of Code for Submit Button Click */

// Following function will save the HTML into a file in the mobile with an file extention of .v3
//  3 parts that will use this function : when new job is downloaded, user initial manual save, user submit form
function newSaveDividedForm(html_file, auto_save, is_new_form, new_form_data, is_saving_before_queued)
{
    console.log("=====> html_file: " + html_file)
    jobBeingSaved = html_file;
    isAutoSave = auto_save;
    isNewForm = is_new_form;
    newFormData = new_form_data;
    isSavingBeforeQueued = is_saving_before_queued;

    var allHtml = '';

    //fileWriter has been reset, write file
    $('input[type="text"]').each(function () {
        $(this).attr("value", $(this).val());
    });

    $('textarea').each(function () {
        $(this).html($(this).val());
    });

    $('select').each(function () {
        $(this).find('option[value!="' + $(this).val() + '"]').attr("selected", false);
        $(this).find('option[value="' + $(this).val() + '"]').attr("selected", true);

    });
    $('fieldset').each(function () {
        $(this).find('input[type="radio"]:checked').attr("checked", true);
        $(this).find('input[type="radio"]:not(:checked)').removeAttr("checked");
        $(this).find('input[type="checkbox"]:checked').attr("checked", true);
        $(this).find('input[type="checkbox"]:not(:checked)').removeAttr("checked");
    });

    $('input[type="date"]').each(function () {
        $(this).attr("value", $(this).val());
    });

    $('input[type="time"]').each(function () {
        $(this).attr("value", $(this).val());
    });

    $('input[type="datetime-local"]').each(function () {
        $(this).attr("value", $(this).val());
    });

    $('input[type="email"]').each(function () {
        $(this).attr("value", $(this).val());
    });
    $('input[type="number"]').each(function () {
        $(this).attr("value", $(this).val());
    });

    if (isNewForm)
    {
        allHtml = newFormData;
    }
    else
    {
        allHtml = $("#form_content").html();
    }
    console.log("=====> allHTML: " + allHtml)

    // slice from 0 positon and 5m character
    savedContent = allHtml.slice(nextChunkStartPoint,nextChunkStartPoint + formDividerLimit);
    //console.log('Starts at: ' + nextChunkStartPoint + ', savedContent length: ' + savedContent.length);
    writeLogs("Starts at: " + nextChunkStartPoint + ", savedContent length: " + savedContent.length + " for File Name = " + html_file );

    if (nextChunkStartPoint < allHtml.length) // this check if there a need for v1, if dont need, go delete v1 and continue
    {
        newSaveForm(jobBeingSaved + '-' + savingFilenameIndex, savedContent); // this function ask to save the v0, v1, v2.
        nextChunkStartPoint += formDividerLimit;
        savingFilenameIndex++;
    }
    else
    {
        resetFormDeleter();
        newDeleteFile(html_file, savingFilenameIndex); // this is to delete the additional vX created.

        spinOut();

        if (isAutoSave == false)
        {
            //console.log("newSaveDividedForm manualSave success");
            writeLogs("newSaveDividedForm, manaulSave success. saveBtm Clicked. file Name =  " + html_file);

            navigator.notification.alert(lang.Mobile092, function () {
            }, lang.Mobile091, 'OK');
        }
        else
        {
            console.log("newSaveDividedForm autoSave success");

        }

        if (isSavingBeforeQueued == true)
        {
            queueJob(html_file);
        }
    }
}
// insert the job id of the submitted job into the queue array and update the status of the job to "Uploading"
function queueJob(html_file)
{
    // Test updateUploading with timeout 30
    // CHS 09 Sept -- Move this portion to after successfully returning to job screen?
    var id = html_file.split("_")[0];
    var tuploadQueue = [];

    var file_exists = false;
    console.log("X1");
    if (localStorage.getItem("uploadQueue") != "[]" && localStorage.getItem("uploadQueue") != null) {
        tuploadQueue = JSON.parse(window.localStorage["uploadQueue"]).toString().split(",");

//        console.log('$$ queue job tuploadQueue size: ' + tuploadQueue.length);
        for (var i = 0 ; i < tuploadQueue.length ; i++)
        {
//            console.log('$$ ' + i + ' -- filename: ' + tuploadQueue[i])
            if (tuploadQueue[i] === html_file)
            {
//                console.log('$$ file exists: ' + tuploadQueue[i])
                file_exists = true;
                break;
            }
        }
    }

    if (file_exists == false)
    {
        tuploadQueue.push(html_file);
        window.localStorage["uploadQueue"] = JSON.stringify(tuploadQueue);
        //console.log("Queue success. tuploadQueue = " + tuploadQueue );
        writeLogs("queueJob, queue success. tuploadQueue = " + tuploadQueue + " File Added to queue = " + html_file);
    }
    else
    {
        //console.log("$$ Job was already queued. tuploadQueue = " + tuploadQueue);
        writeLogs("queueJob, $$ Job was already queued. tuploadQueue = " + tuploadQueue + " File Name " + html_file);
    }

    // CHS 09 Sept -- Move this portion to after successfully returning to job screen?

    updateUploading();

    function updateUploading()
    {
        var uploadingStatus = "13";

        var now = new Date();
        var now = two(now.getDate()) + two(now.getMonth() + 1) + now.getFullYear() + two(now.getHours()) + two(now.getMinutes()) + two(now.getSeconds());

        var user_id = window.sessionStorage["userID"];
        var asset_id = window.sessionStorage["assetId"];
//        console.log('assetId : ' + asset_id);
        var statuschange_URL = databaseIP + "/Controller/mobile_controller.jsp?type=job&action=statusChange&jobScheduleIds=" + id + "&statusId=" + uploadingStatus
                                    + "&driverId=" + user_id + "&dateTime=" + now + "&assetId=" + asset_id;

        $.ajax({
            url: statuschange_URL,
            type: 'GET',
            timeout: 30000,
            success: function (data) {
                if (data.result)
                {
                    console.log("statuschange success: Uploading " + html_file);
                    writeLogs("statuschange success: Uploading " + html_file);
                    console.log("statuschange statuschange_URL3: " + statuschange_URL);
                    spinOut();

                    $.mobile.changePage("#main", {transition: 'fade', reverse: 'true'});
                    setTimeout(function () {
                        // CHX 28 July loadJob("new");
                        loadJob("all");
                        jobInterval = window.setInterval(function () {
                                    loadJob("all");
                                }, refreshRate);
                    }, 500);
//                    navigator.notification.alert(lang.Mobile105, function () {
                    if (tuploadQueue.length == 1)
                    { //if this is the only job in queue
                        //console.log("No jobs in queue. Starting upload queue now.");
                        writeLogs("No jobs in queue. Starting upload queue now.");
                        newUploadQueue();
                        //uploadQueue(); //start upload immediately
                    }
                    else
                    {
                        writeLogs("Jobs uploading in queue. Job added to queue and pending upload.");
                        //console.log("Jobs uploading in queue. Job added to queue and pending upload.");
                    }
//                    }, lang.Mobile104, 'OK');
                }
                else
                {
                    spinOut();
                    writeLogs("updateUploading,statusChange to Uploading, server send back false");
                    navigator.notification.alert("Please check your connection and try again.", function () {
                    }, "No Response from Server", 'OK');
                }
            },
            error: function (error, errorText, errorThrown) {
                spinOut();
                //console.log("statuschange uploading error: " + error.responseText + " errorText: " + errorText + " errorThrown: " + errorThrown);
                writeLogs("statuschange uploading error: " + error.responseText + " errorText: " + errorText + " errorThrown: " + errorThrown)
//                navigator.notification.alert("Please check your connection and try again.", function () {
//                    }, "No Response from Server", 'OK');
                newPendingStatus(id, uploadingStatus, now, user_id, asset_id);
                uploadPlannedWithoutNetwork();
            }
        });
    }
//    function updateUploading() // will come to here when there is no more file to read from.
//    {
//        //console.log('Completed opening file series for upload: ' + jobBeingUploaded);
//        console.log('New code *******');
//        var id = jobBeingUploaded.split("_")[0];
//        var jobFileText = jobBeingUploaded;
//        writeLogs("openFileUploadFail, Completed opening file series for upload: jobBeingUploaded " + jobBeingUploaded );
//        var driver_id = window.sessionStorage["userID"];
//        var asset_id = window.sessionStorage["assetId"];
//        var version_no = localStorage.getItem("version");
//        var now = new Date();
//        var now = two(now.getDate()) + two(now.getMonth() + 1) + now.getFullYear() + two(now.getHours()) + two(now.getMinutes()) + two(now.getSeconds());
//        var endedStatus = "8";
//        var details = Base64.encode(uploadedJobAllHtml);
//        var JSONText = {};
//
//        JSONText.job_id = parseInt(id);
//        JSONText.driver_id = parseInt(driver_id);
//        JSONText.asset_id = parseInt(asset_id); //xxxx
//        JSONText.version_no = version_no;
//        JSONText.status_id = parseInt(endedStatus);
//        JSONText.details = details;
//        JSONText = JSON.stringify(JSONText);
//
//    //    console.log(details)
//
//      //  var upload_url = databaseIP + "/Controller/mobile_controller.jsp?type=job&action=upload&jobId=" + id + "&assetId=" + asset_id + "&detailsLength=" + details.length + "&driverId=" + driver_id;
//        // TODO change this below URl to stop stuck uploading
//        var upload_url = databaseIP + "/Controller/mobile_controller.jsp?type=job&action=upload&jobId=" + id + "&assetId=" + asset_id + "&detailsLength=" + details.length + "&driverId=" + driver_id + "&dateTime=" + now ;
//        console.log('upload_url new:',upload_url);
//        console.log('Uploading ' + jobBeingUploaded);
//    //    console.log('upload_url: ' + upload_url);
//    //    console.log('JSONText: ' + JSONText);
//    //
//
//        $.ajax({
//            type: 'POST',
//            url: upload_url,
//            data: JSONText,
//            contentType: "application/json",
//            dataType: "json",
//            cache: false,
//            timeout: 300000, // 30000
//            beforeSend: function (){
//              writeLogs("openFileUploadFail, uploading file Name = " +  jobBeingUploaded);
//            },
//            success: function (data)
//            {
//
//                console.log('Uploading data result: ' + data.result);
//                if (data.result)
//                {
//                    resetFormDeleter();
//                    newDeleteFile(jobFileText, 0);
//
//                    var tuploadQueue = [];
//                    if (localStorage.getItem("uploadQueue") != "[]" && localStorage.getItem("uploadQueue") != null) {
//                        tuploadQueue = JSON.parse(window.localStorage["uploadQueue"]).toString().split(",");
//                    }
//
//                    if(tuploadQueue[0] == jobFileText)  {
//                        tuploadQueue.shift();
//                    }
//
//                    window.localStorage["uploadQueue"] = JSON.stringify(tuploadQueue);
//                    $('.uploadCount span').html(tuploadQueue.length); //update Upload count
//                    clearTimeout(uploadInterval); // not to have two instant of uploadInterval occuring at the same time, therefore, clear first before re-initatiate.
//                    uploadInterval = setTimeout(function () {
//                        newUploadQueue();
//                    }, uploadDelay); //calls again after 30seconds
//    //
//    //                setTimeout(function () {
//    //                    newUploadQueue();
//    //                }, uploadDelay); //calls again after 30seconds
//                    writeLogs("openFileUploadFail, Successfully Upload Job to Server : " + data.result + " Job id " + id );
//                }
//                else
//                {
//                    clearTimeout(uploadInterval);
//                    uploadInterval = setTimeout(function () {
//                        newUploadQueue();
//                    }, uploadDelay);
//                    writeLogs("openFileUploadFail, Upload Job to Server Data Result False, Server Reject? Re-queue job for uploading : "  + data.result + "job_id = " + id );
//                    changeArraySequence();
//                }
//            },
//            error: function (error, errorText, errorThrown) {
//                //console.log("upload job error: " + error.responseText + " errorText: " + errorText + " errorThrown: " + errorThrown);
//                writeLogs("openFileUploadFail, upload job error: " + error + " errorText: " + errorText + " errorThrown: " + errorThrown + " job_id " + id);
//                clearTimeout(uploadInterval);
//                    uploadInterval = setTimeout(function () {
//                        newUploadQueue();
//                    }, uploadDelay);
//                changeArraySequence();
//            }
//        });
////        function changeArraySequence(){
////            var tuploadQueue = [];
////            if (localStorage.getItem("uploadQueue") != "[]" && localStorage.getItem("uploadQueue") != null) {
////                tuploadQueue = JSON.parse(window.localStorage["uploadQueue"]).toString().split(",");
////            }
////
////            tuploadQueue.reverse();
////            window.localStorage["uploadQueue"] = JSON.stringify(tuploadQueue);
////            writeLogs("Changed UploadQueue Array Sequence. New array sequence = " + tuploadQueue);
////            //console.log("CHANGED ARRAY SEQUENCE");
////        }
////    }
    function uploadPlannedWithoutNetwork()
    {
        $.mobile.changePage("#main", {transition: 'fade', reverse: 'true'});
        setTimeout(function ()
        {
            loadJob("all");
            jobInterval = window.setInterval(function () {
                loadJob("all");
            }, refreshRate);
        }, 500);
    //                    navigator.notification.alert(lang.Mobile105, function () {

        if (tuploadQueue.length == 1)
        { //if this is the only job in queue
            writeLogs("No jobs in queue. Starting upload queue now.");
            newUploadQueue();
        }
        else
        {
            writeLogs("Jobs uploading in queue. Job added to queue and pending upload.");
        }
    }
}


$( document ).on( "pageshow", "#main", function( event )
{
    var uploadQueueArr = [];

    if (window.localStorage["uploadQueue"])
    {
        uploadQueueArr = JSON.parse(window.localStorage["uploadQueue"]).toString().split(",");
    //    console.log('xxx uploadQueueArr: ' + uploadQueueArr);

        $('ul li').each(function(i)
        {
            var liName = $(this).attr('name'); // This is your rel value
    //        console.log('xxx liName = ' + liName);

            for (var i = 0 ; i < uploadQueueArr.length ; i++)
            {
                if (uploadQueueArr[i] == liName)
                {
    //                console.log('xxx hey same! remove plx')
                    var jobCount = $('#main .jobCount span').text();
                    var newJobCount = parseInt(jobCount, 10) - 1;
                    $('#main .jobCount span').html(newJobCount);
                    $(this).remove();
                    break;
                }
            }
        });
    }
});


function newPendingStatus(jobId, statusId, time, userId, assetId)
{
    if (window.localStorage["pendingJobId"])
    {
        var pendingJobId = window.localStorage["pendingJobId"].split(',');
        var pendingStatusId = window.localStorage["pendingStatusId"].split(',');
        var pendingTime = window.localStorage["pendingTime"].split(',');
        var pendingUserId = window.localStorage["pendingUserId"].split(',');
        var pendingAssetId = window.localStorage["pendingAssetId"].split(',');

//        console.log('xxx there exists.. current pendingJobId.length: ' + pendingJobId.length);
    }
    else
    {
        var pendingJobId = [];
        var pendingStatusId = [];
        var pendingTime = [];
        var pendingUserId = [];
        var pendingAssetId = [];
    }

    pendingJobId.push(jobId);
    pendingStatusId.push(statusId);
    pendingTime.push(time);
    pendingUserId.push(userId);
    pendingAssetId.push(assetId);

    window.localStorage["pendingJobId"] = pendingJobId.join();
    window.localStorage["pendingStatusId"] = pendingStatusId.join();
    window.localStorage["pendingTime"] = pendingTime.join();
    window.localStorage["pendingUserId"] = pendingUserId.join();
    window.localStorage["pendingAssetId"] = pendingAssetId.join();
}


function sendPendingStatusUpdates()
{
    if (window.localStorage["pendingJobId"])
    {
        var pendingJobId = window.localStorage["pendingJobId"].split(',');
        var pendingStatusId = window.localStorage["pendingStatusId"].split(',');
        var pendingTime = window.localStorage["pendingTime"].split(',');
        var pendingUserId = window.localStorage["pendingUserId"].split(',');
        var pendingAssetId = window.localStorage["pendingAssetId"].split(',');

//        console.log('xxx pendingJobId.length: ' + pendingJobId.length);

        /*
         *
         uploading
        var statuschange_URL = databaseIP + "/Controller/mobile_controller.jsp?type=job&action=statusChange&jobScheduleIds=" + id + "&statusId=" + uploadingStatus
                + "&driverId=" + user_id + "&dateTime=" + now + "&assetId=" + asset_id;

        startjob
            var statuschange_URL = databaseIP + "/Controller/mobile_controller.jsp?type=job&action=statusChange&jobScheduleIds=" + job_id
                + "&statusId=" + startedStatus + "&dateTime=" + now + "&assetId=" + asset_id;

         *
         *
         */

        var userId = 0;
        if (parseInt(pendingUserId[0],10) > 0)
        {
            userId = parseInt(pendingUserId[0],10);
        }

        var url = databaseIP + "/Controller/mobile_controller.jsp?type=job&action=statusChange&"
                    + "jobScheduleIds=" + pendingJobId[0]
                    + "&statusId=" + pendingStatusId[0]
                    + "&driverId=" + userId
                    + "&dateTime=" + pendingTime[0]
                    + "&assetId=" + pendingAssetId[0];

//        console.log('xxx sendPendingStatusUpdates: ' + url)

        $.ajax({
            url: url,
            type: 'GET',
            timeout: 30000,
            success: function (data)
            {
                // send regardless of data.result, in case job got deleted.
                pendingJobId.shift();
                pendingStatusId.shift();
                pendingTime.shift();
                pendingUserId.shift();
                pendingAssetId.shift();

                window.localStorage["pendingJobId"] = pendingJobId.join();
                window.localStorage["pendingStatusId"] = pendingStatusId.join();
                window.localStorage["pendingTime"] = pendingTime.join();
                window.localStorage["pendingUserId"] = pendingUserId.join();
                window.localStorage["pendingAssetId"] = pendingAssetId.join();
            },
            error: function (error, errorText, errorThrown) {
//                console.log('xxx still no network...');
            }
        });
    }
    else
    {
//        console.log('xxx no more pendings to upload...')
    }
}
/* Utilities Function */

/*  Date & Time Function  */


function two(num) {
    var num = ("0" + num).slice(-2);
    return num;
}
function mth(num) {
    var month = "";
    switch (num) {
        case 1:
            month = "Jan";
            break;
        case 2:
            month = "Feb";
            break;
        case 3:
            month = "Mar";
            break;
        case 4:
            month = "Apr";
            break;
        case 5:
            month = "May";
            break;
        case 6:
            month = "Jun";
            break;
        case 7:
            month = "Jul";
            break;
        case 8:
            month = "Aug";
            break;
        case 9:
            month = "Sep";
            break;
        case 10:
            month = "Oct";
            break;
        case 11:
            month = "Nov";
            break;
        case 12:
            month = "Dec";
            break;
        default:
            month = num;
            break;
    }
    return month;
}

// Get Date time in different format
function getCurrentDateTime(mode) {
    var now = new Date();
    var currentDateTime = "";
    switch(mode) {
        case 1:  //display both
            currentDateTime = two(now.getDate()) + "/"
                    + two(now.getMonth() + 1) + "/"
                    + two(now.getFullYear()) + " "
                    + two(now.getHours()) + ":"
                    + two(now.getMinutes()) + ":"
                    + two(now.getSeconds());
            break;
        case 2: // hide date display time
            currentDateTime = two(now.getHours()) + ":"
                    + two(now.getMinutes()) + ":"
                    + two(now.getSeconds());
            break;
        case 3: // display date hide time
            currentDateTime = two(now.getDate()) + "/"
                    + two(now.getMonth() + 1) + "/"
                    + two(now.getFullYear());
            break;
        case 4: // this is special case, to show the month as Jan/Feb
            currentDateTime = two(now.getDate()) + " "
                        + mth(now.getMonth() + 1) + " "
                        + now.getFullYear() + " "
                        + two(now.getHours()) + ":"
                        + two(now.getMinutes()) + ":"
                        + two(now.getSeconds());
            break;
        case 5: // date for system files etc, log file
            currentDateTime = two(now.getDate()) + "-"
                    + two(now.getMonth() + 1) + "-"
                    + two(now.getFullYear());
            break;
        default:
            currentDateTime = "";
            break;
    }
    return currentDateTime;
}
function rebindMainJobList() { // using .one function so that user dont spam click and cause problem to the loading of the form. This will rebind the joblist with .one so user can continue clicking
    $('#main .jobList li').off('click');
    $('#main .jobList li').on('click', function (e) {
        if ($(this).attr('name') != null
                && $(e.target).attr('class') != "job-value job-navigate"
                && $(e.target).attr('class') != "job-details"
                && $(e.target).attr('class') != "job-value job-dl"
                && $(e.target).attr('class') != "sort-div sort-down"
                && $(e.target).attr('class') != "sort-div sort-up") {
            goForm($(this).attr('job_id'), $(this).attr('name'), $(this).attr('job_name'), $(this).attr('job_type_id'), $(this).attr('job_status'));
        }
    });
}
// when take photo, save image to user mobile gallery if form field enable "save to gallery"
function saveProcessedImage(base64String)
{
    var jobId = window.sessionStorage["selected_id"];
    var params = {data: base64String, prefix: 'JOB_' + jobId + '_', format: 'JPG', quality: 100};
    window.imageSaver.saveBase64Image(params,
        function (filePath) {
          writeLogs("File saved on " + filePath);
          //console.log('File saved on ' + filePath);
        },
        function (msg) {
          //console.error(msg);
          writeLogs("Saving Processed Image Error " + msg);
        }
      );
}


function stat(status) { //give status id and returns status in string
    status = parseInt(status); //convert to int
    var stat = "";
    switch (status) {
        case 0:
            stat = "<mark style='background-color:#000000;border-radius:5px;padding:0 10px;color:#FFF;'>" + lang.Mobile040 + "</mark>";
            break;
        case 1:
            stat = "<mark style='background-color:#AE9A9A;border-radius:5px;padding:0 10px;color:#FFF;'>" + lang.Mobile041 + "</mark>";
            break;
        case 2:
            stat = "<mark style='background-color:#6BAC61;border-radius:5px;padding:0 10px;color:#FFF;'>" + lang.Mobile039 + "</mark>";
            break;
        case 3:
            stat = "<mark style='background-color:#000000;border-radius:5px;padding:0 10px;color:#FFF;'>" + lang.Mobile042 + "</mark>";
            break;
        case 4:
            stat = "<mark style='background-color:#000000;border-radius:5px;padding:0 10px;color:#FFF;'>" + lang.Mobile043 + "</mark>";
            break;
        case 5:
            stat = "<mark style='background-color:#FFBC00;border-radius:5px;padding:0 10px;color:#FFF;'>" + lang.Mobile044 + "</mark>";
            break;
        case 6:
            stat = "<mark style='background-color:#000000;border-radius:5px;padding:0 10px;color:#FFF;'>" + lang.Mobile045 + "</mark>";
            break;
        case 7:
            stat = "<mark style='background-color:#70E15E;border-radius:5px;padding:0 10px;color:#FFF;'>" + lang.Mobile046 + "</mark>";
            break;
        case 8:
            stat = "<mark style='background-color:#66A9FF;border-radius:5px;padding:0 10px;color:#FFF;'>" + lang.Mobile047 + "</mark>";
            break;
        case 9:
            stat = "<mark style='background-color:#000000;border-radius:5px;padding:0 10px;color:#FFF;'>" + lang.Mobile048 + "</mark>";
            break;
        case 10:
            stat = "<mark style='background-color:#000000;border-radius:5px;padding:0 10px;color:#FFF;'>" + lang.Mobile049 + "</mark>";
            break;
        case 11:
            stat = "<mark style='background-color:#000000;border-radius:5px;padding:0 10px;color:#FFF;'>" + lang.Mobile050 + "</mark>";
            break;
        case 12:
            stat = "<mark style='background-color:#CBA2E4;border-radius:5px;padding:0 10px;color:#FFF;'>" + lang.Mobile051 + "</mark>";
            break;
        case 13:
            stat = "<mark style='background-color:#30ECEF;border-radius:5px;padding:0 10px;color:#FFF;'>" + lang.Mobile052 + "</mark>";
            break;
        default:
            stat = "<mark style='background-color:#000000;border-radius:5px;padding:0 10px;color:#FFF;'>" + status + "</mark>";
            break;
    }
    return stat;
}

function ratingsSummary() {
    var arr = [];
    var score = 0;
    var ratingNum = 0;
    var percentage = 0;
    var max = $('.ratings').attr("data-max");

    $('input[class="rating-input"]:checked').each(function () {
        if (this.value == 0.1) {
            ratingNum++;
        } else if (parseInt(this.value) != 0) {
            score += parseInt(this.value);
            ratingNum++;
        }
        percentage = ((score / (ratingNum * max)) * 100).toFixed(2);
    });
    arr.push(score);
    arr.push(percentage);
    return arr;
}


// sorting algo for Wifiwizard.
var sort_by;
(function() {
    // utility functions
    var default_cmp = function(a, b) {
            if (a == b) return 0;
            return a < b ? -1 : 1;
        },
        getCmpFunc = function(primer, reverse) {
            var dfc = default_cmp, // closer in scope
                cmp = default_cmp;
            if (primer) {
                cmp = function(a, b) {
                    return dfc(primer(a), primer(b));
                };
            }
            if (reverse) {
                return function(a, b) {
                    return -1 * cmp(a, b);
                };
            }
            return cmp;
        };

    // actual implementation
    sort_by = function() {
        var fields = [],
            n_fields = arguments.length,
            field, name, reverse, cmp;

        // preprocess sorting options
        for (var i = 0; i < n_fields; i++) {
            field = arguments[i];
            if (typeof field === 'string') {
                name = field;
                cmp = default_cmp;
            }
            else {
                name = field.name;
                cmp = getCmpFunc(field.primer, field.reverse);
            }
            fields.push({
                name: name,
                cmp: cmp
            });
        }

        // final comparison function
        return function(A, B) {
            var a, b, name, result;
            for (var i = 0; i < n_fields; i++) {
                result = 0;
                field = fields[i];
                name = field.name;

                result = field.cmp(A[name], B[name]);
                if (result !== 0) break;
            }
            return result;
        }
    }
}());


// * Start of Queue Page */ Currently not activated. Not sure what exacting does this do.

var queuePointer = ""; //yyy

function initQueueList() { //yyy
    $("#queue .backBtn").unbind('click');
    $("#queue .queueList li .upBtn").unbind('click');
    $("#queue .queueList li .delBtn").unbind('click');
    // $("#queue .logView").html("");
    $("#queue .logView").hide();
    $("#queue .logBtn img").attr("src", "img/info_off.png");
    $("#queue .queueList ul").html("");
    console.log("X2");
    if (localStorage.getItem("uploadQueue") != "[]" && localStorage.getItem("uploadQueue") != null) {
        var tuploadQueue = [];
        tuploadQueue = JSON.parse(window.localStorage["uploadQueue"]).toString().split(",");

        for (i = 0; i < tuploadQueue.length; i++) {
            $("#queue .queueList ul").append("<li><div>" + tuploadQueue[i] + "</div><span class='upBtn'>UPL</span><span class='delBtn'>DEL</span></li>")
        }
    } else {
        $("#queue .queueList ul").html("No job currently in queue.");
    }

    $("#queue .backBtn").bind('click', function () {
        $("#queue .logView").hide();
        queuePointer = "";
        $.mobile.changePage("#main", {transition: 'flip', reverse: 'true'});
    })

    $("#queue .logBtn").bind('click', function () {
        if ($("#queue .logBtn img").attr("src") == "img/info_off.png") {
            $("#queue .logBtn img").attr("src", "img/info_on.png");
        } else {
            $("#queue .logBtn img").attr("src", "img/info_off.png");
        }
        $("#queue .logView").toggle();
    })

    $("#queue .queueList li .upBtn").bind('click', function () {
        queuePointer = $(this).parent().find("div").html();
        navigator.notification.confirm(
                "Confirm upload " + queuePointer + "? \nDo not attempt to upload another job before this current one finishes.\nIf you face any issue during the upload, please screenshot the message.",
                confirmUpQueue,
                "Confirm Upload Job",
                ["NO", "YES"]
                );
    })

    $("#queue .queueList li .delBtn").bind('click', function () {
        queuePointer = $(this).parent().find("div").html();
        navigator.notification.confirm(
                "Confirm delete " + queuePointer + "? \nThis job will be removed from the queue.",
                confirmDelQueue,
                "Confirm Delete Job",
                ["NO", "YES"]
                );
    })
}
// Do we still need this queue page?

function singleQueueUpload() { //yyy
    $("#queue .logView").append("Starting single upload function.<br>");
    $("#queue .logView").show();
    $("#queue .logView").html("");

    var html_file = queuePointer;
    $("#queue .logView").append("Uploading " + html_file + ".<br>");
    if (html_file != "") {
        $("#queue .logView").append("File name is not null" + ".<br>");
        var id = html_file.split("_")[0];
        var driver_id = window.sessionStorage["userID"];
        var asset_id = window.sessionStorage["assetId"];
        var version_no = localStorage.getItem("version");

        $("#queue .logView").append("ID=" + id + ", DRIVER_ID=" + driver_id + ".<br>");
        $("#queue .logView").append("Looking for file in appDirectory" + ".<br>");
        appDirectory.getFile(html_file, {create: false}, function (fileEntry) {
            $("#queue .logView").append("appDirectory.getFile Success.<br>");
            fileEntry.file(uploadWin, uploadFail);
        }, uploadFail);

        function uploadWin(file) {
            $("#queue .logView").append("File is found" + ".<br>");
            var reader = new FileReader();
            $("#queue .logView").append("Created new FileReader" + ".<br>");
            reader.onloadend = function (evt) {
                $("#queue .logView").append("FileReader onloadend" + ".<br>");
                var endedStatus = "8";
                var details = Base64.encode(evt.target.result);
                if (details != null && details != undefined) {
                    $("#queue .logView").append("File content is not null or undefined" + ".<br>");
                } else {
                    $("#queue .logView").append("File content is: " + details + "<br>");
                }
                $("#queue .logView").append("Forming JSONText" + ".<br>");
                var JSONText = {};
                JSONText.job_id = parseInt(id);
                JSONText.driver_id = parseInt(driver_id);
                JSONText.asset_id = parseInt(asset_id); //xxxx
                JSONText.status_id = parseInt(endedStatus);
                JSONText.version_no = version_no;
                JSONText.details = details;
                JSONText = JSON.stringify(JSONText);
                $("#queue .logView").append("JSONText formed success" + ".<br>");
                var upload_url = databaseIP + "/Controller/mobile_controller.jsp?type=job&action=upload";
                console.log('upload_url1:',upload_url);
                $("#queue .logView").append("Uploading JSON To: " + upload_url + "<br>");
                $("#queue .logView").append("Waiting response from server." + ".<br>");
                $.ajax({
                    type: 'POST',
                    url: upload_url,
                    data: JSONText,
                    contentType: "application/json",
                    dataType: "json",
                    cache: false,
                    timeout: 300000,
                    success: function (data) {
                        if (data.result) {
                            $("#queue .logView").append("Upload File Success. id=" + id + "<br>");
                            $("#queue .logView").append("DeleteFunction: Starting function to delete physical file." + ".<br>");
                            deleteUploaded(); //delete uploaded file

                            $("#queue .logView").append("Removing " + html_file + " filename from Queuelist" + ".<br>");
                            $("#queue .logView").append("Getting Queuelist" + ".<br>");
                            var tuploadQueue = [];
                            console.log("X3");
                            if (localStorage.getItem("uploadQueue") != "[]" && localStorage.getItem("uploadQueue") != null) {
                                tuploadQueue = JSON.parse(window.localStorage["uploadQueue"]).toString().split(",");
                            }
                            $("#queue .logView").append("Current Queuelist= " + tuploadQueue.toString() + "<br>");
                            var index = tuploadQueue.indexOf(html_file);
                            tuploadQueue.splice(index, 1);
                            $("#queue .logView").append("Removing index=" + index + " job from the list.<br>");
                            window.localStorage["uploadQueue"] = JSON.stringify(tuploadQueue);
                            $("#queue .logView").append("New Queuelist= " + window.localStorage["uploadQueue"] + "<br>");
                            console.log("DEBUG3:",index)
                            $('.uploadCount span').html(tuploadQueue.length); //update Upload count
                            $("#queue .logView").append("Queue Length= " + tuploadQueue.length + "<br>");
                            $("#queue .logView").append("Finished. Closing log in 3 seconds.<br>");
                            setTimeout(function () {
                                $("#queue .logView").hide();
                                initQueueList()
                            }, 3000)
                        } else {
                            $("#queue .logView").append("Upload File Failed. Response result is false. id=" + id + "<br>");
                            $("#queue .logView").append("Please take a screenshot of this log.<br>Press the back button on the top left to exit.<br>");
                        }
                    },
                    //timeout: 540000, //180000
                    error: function (error, errorText, errorThrown) {
                        $("#queue .logView").append("Server response throws error. error: " + error + " errorText: " + errorText + " errorThrown: " + errorThrown + "<br>");
                        $("#queue .logView").append("Please take a screenshot of this log.<br>Press the back button on the top left to exit.<br>");
                    }
                });
            };
            reader.readAsText(file);
        }
        ;

        function uploadFail(error) {
            console.log("uploadFail");
            $("#queue .logView").append("Unable to find file in appDirectory. Error Code: " + error.code + ". Attempt to find file in uploadDirectory.<br>");
            uploadDirectory.getFile(html_file, {create: false}, function (fileEntry) {
                $("#queue .logView").append("uploadDirectory.getFile Success.<br>");
                fileEntry.file(uploadWin, uploadFail2);
            }, uploadFail2);
        }

        function uploadFail2(error) {
            console.log("uploadFail2");
            $("#queue .logView").append("Unable to find file in uploadDirectory. Error Code: " + error.code + ".<br>");
            $("#queue .logView").append("File in queue does not exist anymore.<br>");
            $("#queue .logView").append("Removing " + html_file + " filename from Queuelist" + ".<br>");
            $("#queue .logView").append("Getting Queuelist" + ".<br>");
            var tuploadQueue = [];
            console.log("X4");
            if (localStorage.getItem("uploadQueue") != "[]" && localStorage.getItem("uploadQueue") != null) {
                tuploadQueue = JSON.parse(window.localStorage["uploadQueue"]).toString().split(",");
            }
            $("#queue .logView").append("Current Queuelist= " + tuploadQueue.toString() + "<br>");
            var index = tuploadQueue.indexOf(html_file);
            console.log("DEBUG1:",index)
            tuploadQueue.splice(index, 1);
            $("#queue .logView").append("Removing index=" + index + " job from the list.<br>");
            window.localStorage["uploadQueue"] = JSON.stringify(tuploadQueue);
            $("#queue .logView").append("New Queuelist= " + window.localStorage["uploadQueue"] + "<br>");
            console.log("DEBUG2:",index)
            $('.uploadCount span').html(tuploadQueue.length); //update Upload count
            $("#queue .logView").append("Queue Length= " + tuploadQueue.length + "<br>");
            $("#queue .logView").append("Finished. Closing log in 3 seconds.<br>");
            setTimeout(function () {
                $("#queue .logView").hide();
                initQueueList()
            }, 3000)
        }

        function deleteUploaded() {
            $("#queue .logView").append("DeleteFunction: Looking for file in appDirectory" + ".<br>");
            appDirectory.getFile(html_file, {create: false}, function (fileEntry) {
                $("#queue .logView").append("DeleteFunction: appDirectory.getFile Success.<br>");
                fileEntry.remove(function () {
                    $("#queue .logView").append("DeleteFunction: Delete physical file form appDirectory Success.<br>");
                }, function () {
                    $("#queue .logView").append("DeleteFunction: Delete physical file form appDirectory Failed.<br>");
                    deleteUploaded();
                    $("#queue .logView").append("DeleteFunction: Calling delete function again.<br>");
                });
            }, function () {
                $("#queue .logView").append("DeleteFunction: Unable to find file in appDirectory. Error Code: " + error.code + ". Attempt to find file in uploadDirectory.<br>");
                uploadDirectory.getFile(html_file, {create: false}, function (fileEntry) {
                    $("#queue .logView").append("DeleteFunction: uploadDirectory.getFile Success.<br>");
                    fileEntry.remove(function () {
                        $("#queue .logView").append("DeleteFunction: Delete physical file form appDirectory Success.<br>");
                    }, function () {
                        $("#queue .logView").append("DeleteFunction: Delete physical file form appDirectory Failed.<br>");
                        deleteUploaded();
                        $("#queue .logView").append("DeleteFunction: Calling delete function again.<br>");
                    });
                }, function () {
                    $("#queue .logView").append("DeleteFunction: Unable to find file in uploadDirectory. Error Code: " + error.code + ".<br>");
                    $("#queue .logView").append("DeleteFunction: Physical file does not exist for unknown reason.");
                    $("#queue .logView").append("Please take a screenshot of this log.<br>Press the back button on the top left to exit.<br>");
                });
            });
        }
    } else {
        $("#queue .logView").append("File name is null.<br>");
        $("#queue .logView").append("Removing " + html_file + " filename from Queuelist" + ".<br>");
        $("#queue .logView").append("Getting Queuelist" + ".<br>");
        var tuploadQueue = [];
        console.log("X5");
        if (localStorage.getItem("uploadQueue") != "[]" && localStorage.getItem("uploadQueue") != null) {
            tuploadQueue = JSON.parse(window.localStorage["uploadQueue"]).toString().split(",");
        }
        $("#queue .logView").append("Current Queuelist= " + tuploadQueue.toString() + "<br>");
        var index = tuploadQueue.indexOf(html_file);
        tuploadQueue.splice(index, 1);
        $("#queue .logView").append("Removing index=" + index + " job from the list.<br>");
        window.localStorage["uploadQueue"] = JSON.stringify(tuploadQueue);
        $("#queue .logView").append("New Queuelist= " + window.localStorage["uploadQueue"] + "<br>");
        console.log("DEBUG4:",index)
        $('.uploadCount span').html(tuploadQueue.length); //update Upload count
        $("#queue .logView").append("Queue Length= " + tuploadQueue.length + "<br>");
        $("#queue .logView").append("Finished. Closing log in 3 seconds.<br>");
        setTimeout(function () {
            $("#queue .logView").hide();
            initQueueList()
        }, 3000)
    }
}

function singleQueueDelete() { //yyy

    console.log("singleQueueDelete");
    $("#queue .logView").append("Starting single delete function.<br>");
    $("#queue .logView").show();
    $("#queue .logView").html("");

    var html_file = queuePointer;
    $("#queue .logView").append("Deleting " + html_file + ".<br>");

    $("#queue .logView").append("DeleteFunction: Looking for file in appDirectory" + ".<br>");
    appDirectory.getFile(html_file, {create: false}, function (fileEntry) {
        $("#queue .logView").append("DeleteFunction: appDirectory.getFile Success.<br>");
        fileEntry.remove(function () {
            $("#queue .logView").append("DeleteFunction: Delete physical file form appDirectory Success.<br>");
        }, function () {
            $("#queue .logView").append("DeleteFunction: Delete physical file form appDirectory Failed.<br>");
            deleteUploaded();
            $("#queue .logView").append("DeleteFunction: Calling delete function again.<br>");
        });
    }, function (error) {
        $("#queue .logView").append("DeleteFunction: Unable to find file in appDirectory. Error Code: " + error.code + ". Attempt to find file in uploadDirectory.<br>");
        uploadDirectory.getFile(html_file, {create: false}, function (fileEntry) {
            $("#queue .logView").append("DeleteFunction: uploadDirectory.getFile Success.<br>");
            fileEntry.remove(function () {
                $("#queue .logView").append("DeleteFunction: Delete physical file form appDirectory Success.<br>");
            }, function () {
                $("#queue .logView").append("DeleteFunction: Delete physical file form appDirectory Failed.<br>");
                deleteUploaded();
                $("#queue .logView").append("DeleteFunction: Calling delete function again.<br>");
            });
        }, function (error) {
            $("#queue .logView").append("DeleteFunction: Unable to find file in uploadDirectory. Error Code: " + error.code + ".<br>");
            $("#queue .logView").append("DeleteFunction: Physical file does not exist anymore.<br>");
            $("#queue .logView").append("Finished. Closing log in 3 seconds.<br>");
            setTimeout(function () {
                $("#queue .logView").hide();
                initQueueList()
            }, 3000)
        });
    });

    $("#queue .logView").append("Removing " + html_file + " filename from Queuelist" + ".<br>");
    $("#queue .logView").append("Getting Queuelist" + ".<br>");
    var tuploadQueue = [];
    console.log("X6");
    if (localStorage.getItem("uploadQueue") != "[]" && localStorage.getItem("uploadQueue") != null) {
        tuploadQueue = JSON.parse(window.localStorage["uploadQueue"]).toString().split(",");
    }
    $("#queue .logView").append("Current Queuelist= " + tuploadQueue.toString() + "<br>");
    var index = tuploadQueue.indexOf(html_file);
    tuploadQueue.splice(index, 1);
    $("#queue .logView").append("Removing index=" + index + " job from the list.<br>");
    window.localStorage["uploadQueue"] = JSON.stringify(tuploadQueue);
    $("#queue .logView").append("New Queuelist= " + window.localStorage["uploadQueue"] + "<br>");
    console.log("DEBUG5:",index)
    $('.uploadCount span').html(tuploadQueue.length); //update Upload count
    $("#queue .logView").append("Queue Length= " + tuploadQueue.length + "<br>");
    $("#queue .logView").append("Finished. Closing log in 3 seconds.<br>");
    setTimeout(function () {
        $("#queue .logView").hide();
        initQueueList()
    }, 3000)
}

function confirmUpQueue(response) { //yyy
    if (response == 2) { //if Yes
        singleQueueUpload();
    } else {
        //else do nothing
    }
}

function confirmDelQueue(response) { //yyy

    console.log("confirmDelQueue : response = " + response);
    if (response == 2) { //if Yes
        singleQueueDelete();
    } else {
        //else do nothing
    }
}
//function uploadQueue() { // dont think this is using anymore. this is for queue list DONT DELTE
//    console.log("Checking uploadQueue for files.");
//    console.log("=== CHS === UPLOADQUEUE is running!! ===");
//    writeLogs("=== CHS === UPLOADQUEUE is running!! ===");
//    if (localStorage.getItem("uploadQueue") != "[]" && localStorage.getItem("uploadQueue") != null) {
//        var tuploadQueue = [];
//        tuploadQueue = JSON.parse(window.localStorage["uploadQueue"]).toString().split(",");
//        console.log("tUploadQueue : " + tuploadQueue);
//        var html_file = tuploadQueue[0];
//        if (html_file != "") {
//            console.log("File to upload found. Uploading " + html_file);
//            writeLogs("File to upload found. Uploading " + html_file);
//            var id = html_file.split("_")[0];
//            var driver_id = window.sessionStorage["userID"];
//            var asset_id = window.sessionStorage["assetId"];
//            var version_no = localStorage.getItem("version");
//            appDirectory.getFile(html_file, {create: false}, function (fileEntry) {
//                fileEntry.file(uploadWin, uploadFail); // came in
//            }, uploadFail);
//
//            function uploadWin(file) {
//                console.log("uploadWin");
//                var reader = new FileReader();
//                reader.onloadend = function (evt) {
//                    var endedStatus = "8";
//                    var details = Base64.encode(evt.target.result);
//                    var JSONText = {};
//                    JSONText.job_id = parseInt(id);
//                    JSONText.driver_id = parseInt(driver_id);
//                    JSONText.asset_id = parseInt(asset_id); //xxxx
//                    JSONText.version_no = version_no;
//                    JSONText.status_id = parseInt(endedStatus);
//                    JSONText.details = details;
//                    JSONText = JSON.stringify(JSONText);
//                    var upload_url = databaseIP + "/Controller/mobile_controller.jsp?type=job&action=upload";
//                    $.ajax({
//                        type: 'POST',
//                        url: upload_url,
//                        data: JSONText,
//                        contentType: "application/json",
//                        dataType: "json",
//                        cache: false,
//                        timeout: 300000, //180000
//                        success: function (data) {
//                            if (data.result) {
//                                console.log("uploadQueue upload success: id=" + id);
//
//                                deleteUploaded(); //delete uploaded file
//                                var tuploadQueue = [];
//                                if (localStorage.getItem("uploadQueue") != "[]" && localStorage.getItem("uploadQueue") != null) {
//                                    tuploadQueue = JSON.parse(window.localStorage["uploadQueue"]).toString().split(",");
//                                }
//                                tuploadQueue.shift();
//                                window.localStorage["uploadQueue"] = JSON.stringify(tuploadQueue);
//                                $('.uploadCount span').html(tuploadQueue.length); //update Upload count	
//                                setTimeout(function () {
//                                    uploadQueue(); // call uploadQueue again to repeat process for next file	
//                                }, uploadDelay); //calls again after 30seconds
//                                writeLogs("uploadqueue, success to upload : " + data.result + " id " + id);
//                            } else {
//                                /*** CHS 03 Aug 2017: The portion below is causing script error because of coding mistake. 
//                                 *                      Since the shuffling feature is not necessary, let's just comment this out ***/
////                                console.log("uploadQueue upload fail: Upload failed.");
////                                console.log('====CHS tuploadqueue: ' + tuploadQueue);
////                                var failedJob = tuploadQueue.shift();
////                                console.log('====CHS tuploadqueue now: ' + tuploadQueue);
////                                console.log("failed job : " + failedJob);
////                                tuploadQueue = tuploadQueue.push(failedJob); //yyy queue the failed file behind
////                                console.log('====CHS tuploadqueue after pushing failedJob: ' + tuploadQueue);
////                                window.localStorage["uploadQueue"] = JSON.stringify(tuploadQueue);
////                                console.log('====CHS window.localStorage["uploadQueue"] NOW: ' + window.localStorage["uploadQueue"]);
//                                /*** CHS 03 Aug 2017: The portion above is causing script error because of coding mistake. 
//                                 *                      Since the shuffling feature is not necessary, let's just comment this out ***/
//                                setTimeout(function () {
//                                    uploadQueue(); // call uploadQueue again to repeat process for next file	
//                                }, uploadDelay);
//                                writeLogs("uploadqueue, failed to upload error: " + data.result + " id " + id);
//                            }
//                        },
//                        error: function (error, errorText, errorThrown) {
//                            writeLogs("uploadqueue, failed to upload error: " + error.responseText + " errorText: " + errorText + " errorThrown: " + errorThrown);
//                            /*** CHS 03 Aug 2017: The portion below is causing script error because of coding mistake. 
//                                 *                      Since the shuffling feature is not necessary, let's just comment this out ***/
////                                console.log("uploadQueue upload fail: Upload failed.");
////                                console.log('====CHS tuploadqueue: ' + tuploadQueue);
////                                var failedJob = tuploadQueue.shift();
////                                console.log('====CHS tuploadqueue now: ' + tuploadQueue);
////                                console.log("failed job : " + failedJob);
////                                tuploadQueue = tuploadQueue.push(failedJob); //yyy queue the failed file behind
////                                console.log('====CHS tuploadqueue after pushing failedJob: ' + tuploadQueue);
////                                window.localStorage["uploadQueue"] = JSON.stringify(tuploadQueue);
////                                console.log('====CHS window.localStorage["uploadQueue"] NOW: ' + window.localStorage["uploadQueue"]);
//                                /*** CHS 03 Aug 2017: The portion above is causing script error because of coding mistake. 
//                                 *                      Since the shuffling feature is not necessary, let's just comment this out ***/
//                                
//                            setTimeout(function () {
//                                uploadQueue(); // call uploadQueue again to repeat process for next file	
//                            }, uploadDelay);
//                        }
//                    });
//                };
//                reader.readAsText(file);
//            }
//
//            function uploadFail(error) {
//                console.log("uploadFail");
//                console.log("Unable to find file in main folder, now look at upload folder");
//                writeLogs("uploadqueue, Unable to find file in main folder, now look at upload folder. ERROR: " + error.message + error.code + error);
//                uploadDirectory.getFile(html_file, {create: false}, function (fileEntry) { 
//                    fileEntry.file(uploadWin, uploadFail2); 
//                }, uploadFail2);
//            }
//
//            function uploadFail2(error) {
//                console.log("uploadFail2");
//                console.log("uploadQueue Reader Error: " + error.code);
//                console.log("File in queue does not exist anymore. Deleting it from queue.")
//                writeLogs("uploadqueue, File in queue does not exist anymore. Deleting it from queue.. ERROR: " + error.message + error.code + error);
//                var tuploadQueue = [];
//                if (localStorage.getItem("uploadQueue") != "[]" && localStorage.getItem("uploadQueue") != null) {
//                    tuploadQueue = JSON.parse(window.localStorage["uploadQueue"]).toString().split(","); // 1
//                }
//                tuploadQueue.shift();
//                window.localStorage["uploadQueue"] = JSON.stringify(tuploadQueue);
//                $('.uploadCount span').html(tuploadQueue.length); //update Upload count	
//                setTimeout(function () {
//                    uploadQueue(); // call uploadQueue again to repeat process for next file	
//                }, uploadDelay);
//            }
//
//            function deleteUploaded() {
//                console.log("Deleting uploaded job");
//                appDirectory.getFile(html_file, {create: false}, function (fileEntry) {
//                    fileEntry.remove(function () {
//                        console.log("uploadqueue deleted: " + html_file);
//                        writeLogs("uploadqueue deleted: " + html_file);
//                    }, function () {
//                        deleteUploaded();
//                        console.log("uploadqueue error: deleting failed, retrying.");
//                        writeLogs("uploadqueue error: deleting failed, retrying. " + err.code + err.message);
//                    });
//                }, function () {
//                    uploadDirectory.getFile(html_file, {create: false}, function (fileEntry) {
//                        fileEntry.remove(function () {
//                            console.log("uploadqueue deleted: " + html_file);
//                            writeLogs("uploadqueue deleted: " + html_file);
//                        }, function (err) {
//                            deleteUploaded();
//                            console.log("uploadqueue error: deleting failed, retrying.");
//                            writeLogs("uploadqueue error: deleting failed, retrying. " + err.code + err.message);
//                        });
//                    }, function (err) {
//                        writeLogs("uploadqueue: file does not exist " + err.code + err.message);
//                        console.log('uploadqueue: file does not exist');
//                    });
//                });
//            }
//        } else {
//            console.log("uploadqueue: Empty html_file id. Removed and updated uploadQueue.");
//            tuploadQueue.shift();
//            window.localStorage["uploadQueue"] = JSON.stringify(tuploadQueue);
//            $('.uploadCount span').html(tuploadQueue.length); //update Upload count	
//            setTimeout(function () {
//                uploadQueue(); // call uploadQueue again to repeat process for next file	
//            }, uploadDelay); //calls again after 30seconds	
//        }
//    } else { //no files in uploadqueue
//        console.log("No more files to upload.");
//    }
//}

/* 
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */

// handle APNS notifications for iOS
/*
 * Refer to registerPN.js: pushNotification registration function will look for 
 * this function if the device is (iOS or other) on receiving push notification 
 * event.
 * @param {type} e
 * @returns {undefined}
 */
function onNotificationAPN(e)
{
	//$("#app-status-ul").append('<li>push-notification: ' + e.alert + '</li>');
	
	if (e.alert)
	{
		
		// showing an alert also requires the org.apache.cordova.dialogs plugin
		//navigator.notification.alert(e.alert);
	}

	if (e.sound)
	{
		// playing a sound also requires the org.apache.cordova.media plugin
		var snd = new Media(e.sound);
		snd.play();
	}

	if (e.badge)
	{
		pushNotification.setApplicationIconBadgeNumber(successHandler, e.badge);
	}
}

// handle GCM notifications for Android
/*
 * Refer to registerPN.js: pushNotification registration function will look for 
 * this function if the device is Android or Amazon-fireos on receiving push 
 * notification event.
 * @param {type} e
 * @returns {undefined}
 */
function onNotification(e)
{
    
	console.log("\n>> onNotification(e)");
    console.log("\n>> e.event: " + e.event);
	//alert("New Message: " + e.payload.message + "\n\n" + Date());
	
	switch (e.event)
	{
		case 'registered':

			if (e.regid.length > 0)
			{
                            localStorage.setItem("deviceID", e.regid);
            /*              
                                navigator.notification.alert(e.regid, function () {
                        }, lang.Mobile017, '✔');
                                localStorage.setItem("deviceID123", e.regid);
            */
				// Your GCM push server needs to know the regID before it can push to this device
				// here is where you might want to send it the regID for later use.
				console.log(">> onNotification(e) case: registered regID =\n" + e.regid);
				console.log("\n>> A sample PN link:\nhttp://www.v3nity.com/PushNotification/Broadcast?message=V3Test&appName=V3NityPN&deviceType=1&deviceID=" + e.regid);
			}
			break;

		case 'message':
			
			/*
			 * TODO: 3/9/2017: handle the message. if forground or background.
			 */
			
			// if this flag is set, this notification happened while we were in the foreground.
			// you might want to play a sound to get the user's attention, throw up a dialog, etc.
			if (e.foreground)
			{
                                onPushNotification();
                                
                                navigator.vibrate(1000);
				console.log(">> onNotification(e) case: message e.foreground");
                //alert("New Message: " + e.payload.message + "\n\n" + Date());
				// on Android soundname is outside the payload.
				// On Amazon FireOS all custom attributes are contained within payload
                                
                                // JX: not working, give error. Media undefined
//				var soundfile = e.soundname || e.payload.sound;
                                                     
				// if the notification contains a soundname, play it.
				// playing a sound also requires the org.apache.cordova.media plugin
//				var my_media = new Media("/android_asset/www/" + soundfile); 
//
//				my_media.play();
				
			}
			else
			{	// otherwise we were launched because the user touched a notification in the notification tray.
                            
			    console.log(">> onNotification(e) case: message !e.foreground");

				if (e.coldstart) { //http://blog.nimbledroid.com/2016/02/17/cold-start-times-of-top-apps.html?top?=25&category=MUSIC_STREAMING
                                    console.log(">> onNotification(e) case: message !e.foreground e.coldstart");
                                } else { // app in background 
                                    onPushNotification();
                                    console.log(">> onNotification(e) case: message !e.foreground !e.coldstart"); 
                                }
                    }
			break;

		case 'error':
			console.log(">> onNotification(e) case: error");
			break;

		default:
			console.log(">> onNotification(e) case: default");
			break;
	}
}
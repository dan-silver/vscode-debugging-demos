chrome.runtime.onMessage.addListener(preInit);
var extGlobal = {}; //jshint ignore: line
extGlobal.constants = new Constants();
extGlobal.browserGap = new BrowserGap();
extGlobal.photoManager = new PhotoManager();
extGlobal.trendingNow = new TrendingNow();
extGlobal.tracker = new Tracker();
extGlobal.weather = new Weather(); 
extGlobal.bucket = new Bucket();
extGlobal.tabs = chrome.tabs;

extGlobal.photoManager.init();
extGlobal.weather.init();
extGlobal.browserGap.loadTrackingParams();

chrome.runtime.setUninstallURL(extGlobal.constants.chromeUninstallURL);

extGlobal.bucket.init();

chrome.runtime.onInstalled.addListener(function(details){
    if (details.reason === "install") {
        //setDistributionChannel(); not used for Chrome now since each partner has a specific extension
    }
});
initFirstRun();
fetchDistributionChannel();
extGlobal.trendingNow.init();

extGlobal.browserGap.addNewTabListener(function(msg, response){
    if(msg.renderNewTab) {
        var newTabData = {};
        newTabData.weatherData = extGlobal.browserGap.localStorage.getItem("localStorageWeather");
        newTabData.backgroundPhoto = extGlobal.photoManager.getBackgroundPhoto();
        newTabData.topSites = extGlobal.browserGap.getTopSites();
        newTabData.bookmarks = extGlobal.browserGap.getBookmarks();
        newTabData.otherBookmarks = extGlobal.browserGap.getOtherBookmarks();
        newTabData.bucketPermissions = extGlobal.bucket.getPermissionMap();
        newTabData.distributionChannel = extGlobal.distributionChannel;
        newTabData.trendingNowData = extGlobal.browserGap.localStorage.getItem("trendingStories");
        newTabData.enableTN = extGlobal.enableTN;

        response(newTabData);
    }
    if(msg.tracker){
        msg.beaconConfig.params.browser = extGlobal.constants.tracker_browser_chr;
        if(msg.pageInfo)
        {
            extGlobal.tracker.sendBeacon(extGlobal.constants.distributionChannels[extGlobal.distributionChannel].chrome_space_id || extGlobal.constants.chrome_space_id, extGlobal.constants.tracker_page_info, msg.beaconConfig);
        }
        else
        {
            extGlobal.tracker.sendBeacon(extGlobal.constants.distributionChannels[extGlobal.distributionChannel].chrome_space_id || extGlobal.constants.chrome_space_id, extGlobal.constants.tracker_click_info, msg.beaconConfig);
        }

    }
}, preInit);


function preInit( msg, sender, response) {
    if(msg.newTab) {
        response(null);
    }
}

function setDistributionChannel() {
    var re = new RegExp(extGlobal.constants.chrome_ext_url_regexp),
        distribution_channel,
        distribution = {};
    extGlobal.tabs.query({"url": extGlobal.constants.chrome_ext_url_pattern}, function (tabs) {
        if (tabs && tabs[0] && tabs[0].url) {
            if (tabs[0].url.indexOf("?") > -1 && tabs[0].url.indexOf("src=") > -1) {
                distribution_channel = tabs[0].url.substring(tabs[0].url.indexOf("src=")+4, tabs[0].url.length).split("&")[0];
            }
        }
        distribution_channel = distribution_channel || extGlobal.constants.distributionDefaultChannel;
        distribution[extGlobal.constants.distributionChannelPrefKey] = distribution_channel;
        extGlobal.distributionChannel = distribution_channel;
        chrome.storage.sync.set(distribution, function() {
            return;
        });
    });
}

function fetchDistributionChannel() {
    //chrome.storage.sync.get(extGlobal.constants.distributionChannelPrefKey, function(item) {
        //extGlobal.distributionChannel = item[extGlobal.constants.distributionChannelPrefKey];
    extGlobal.distributionChannel = extGlobal.constants.distributionDefaultChannel;
    console.log(extGlobal.distributionChannel);
    //});
}

function isFirstRunCompleted()
{
    return JSON.parse(extGlobal.browserGap.localStorage.getItem("firstRunCompleted"));
}

function initFirstRun(){
    if(!isFirstRunCompleted()) {
        var now = new Date();
        extGlobal.browserGap.localStorage.setItem("firstRunCompleted", JSON.stringify(true));
        extGlobal.browserGap.localStorage.setItem("firstRunCompletedTime", JSON.stringify(now.getTime()));
        if(!extGlobal.browserGap.isOnline()) {
            extGlobal.browserGap.onceOnline(sendInstallPing);
        }else {
            sendInstallPing();
        }
    }
}

function sendInstallPing(){
    var beaconConfig = {};
    var beaconParams = {};
    beaconParams.itype = extGlobal.constants.tracker_install;
    beaconParams.browser = extGlobal.constants.tracker_browser_chr;
    beaconConfig.params = beaconParams;
    setTimeout(function() {
        extGlobal.tracker.sendBeacon(extGlobal.constants.distributionChannels[extGlobal.distributionChannel].chrome_space_id || extGlobal.constants.chrome_space_id, extGlobal.constants.tracker_page_info, beaconConfig);
    }, 1000);
}

// Alive ping
// TODO: chrome intervals and timeouts longer than a minute should use chrome.alarm
setTimeout(function() {
    extGlobal.tracker.initAlivePing(extGlobal.constants.distributionChannels[extGlobal.distributionChannel].chrome_space_id || extGlobal.constants.chrome_space_id, extGlobal.constants.tracker_browser_chr);
}, 1000);

chrome.browserAction.onClicked.addListener(function(activeTab) {
    window.open('newtab.html','_blank');
});


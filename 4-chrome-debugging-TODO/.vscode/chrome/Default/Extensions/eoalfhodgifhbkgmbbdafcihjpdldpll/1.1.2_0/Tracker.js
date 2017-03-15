function Tracker(unittests){ //jshint ignore: line
    var trackerEncoding = new TrackerEncoder();
    trackerEncoding.init();
    function sendBeacon (spaceId, beaconType, beaconConfig)
    {
        if(extGlobal.browserGap.localStorage.getItem('ctid') === null){
            console.log("waiting for ctid");
            setTimeout(sendBeacon.bind(this, spaceId, beaconType, beaconConfig), extGlobal.constants.clueAttemptTimeout);
            return false;
        }
        if(extGlobal.browserGap.isChrome && extGlobal.browserGap.localStorage.getItem('defbrows') === null){
            console.log("waiting for defbrows");
            setTimeout(sendBeacon.bind(this, spaceId, beaconType, beaconConfig), extGlobal.constants.clueAttemptTimeout);
            return false;
        }
        try
        {
            var distributionChannel;
            if (extGlobal.prefService) { //firefox
                distributionChannel = extGlobal.prefService.get(extGlobal.constants.distributionChannelPrefKey);
            } else if (extGlobal.distributionChannel) { //chrome
                distributionChannel = extGlobal.distributionChannel;
            } else { // this should not be reached - sync error?
                distributionChannel = extGlobal.constants.distributionDefaultChannel;
                console.log("Could not find distribution channel, using default");
            }
            var frCode = (extGlobal.browserGap.isFirefox ? extGlobal.constants.distributionChannels[distributionChannel].frCodeFirefox : (extGlobal.browserGap.isSafari ? extGlobal.constants.distributionChannels[distributionChannel].frCodeSafari : extGlobal.constants.distributionChannels[distributionChannel].frCodeChrome));
            var trackingData = [{
                "trackEvt": extGlobal.constants.tracker_page_info,
                "trackParams":
                {
                    "intl": "{intl}",
                    "vtestid": extGlobal.constants.tracker_vtestid,
                    "pc": extGlobal.constants.distributionChannels[distributionChannel].partnerCode,
                    "ver": "{ver}",
                    "itype": "{itype}",
                    "fr": "{fr}",
                    "ctid": "{ctid}",
                    "defbrows": "{defbrows}",
                    "mrkt": "{mrkt}",
                    "delc": "{ext}",
                    "cset": "{cset}",
                    "mset": "{mset}",
                    "browser": "{browser}",
                    "pt":"{pt}",
                    "tn_enable": "{tn_enable}",
                    "tn_num": "{tn_num}",
                    "storeid": "{storeid}",
                    "amp_desc": "{amp_desc}",
                    "partner_sites": "{partner_sites}"
                },
                "useYLC": false,
                "trackSpaceID": spaceId
            },
            {
                "trackEvt": extGlobal.constants.tracker_click_info,
                "trackParams":
                {
                    "intl": "{intl}",
                    "vtestid": extGlobal.constants.tracker_vtestid,
                    "pc": extGlobal.constants.distributionChannels[distributionChannel].partnerCode,
                    "ver": "{ver}",
                    "ctid": "{ctid}",
                    "mrkt": "{mrkt}",
                    "sec": "{sec}",
                    "slk": "{slk}",
                    "tar": "{tar}",
                    "_p": "{_p}",
                    "gpos": "{gpos}",
                    "delc": "{ext}",
                    "browser": "{browser}",
                    "fr": "{fr}",
                    "storeid": "{storeid}",
                    "amp_desc": "{amp_desc}"
                },
                "useYLC": unittests ? false:true,
                "trackSpaceID": spaceId
            }];

            var trackTypeCount= trackingData.length;
            var logResponse = function(responseText){ 
                console.log("Response Text = " + responseText);
            };

            for (var trackTypeOn= 0; trackTypeOn < trackTypeCount; trackTypeOn++)
            {
                var trackTypeCur= trackingData[trackTypeOn];
                if (trackTypeCur.trackSpaceID && (trackTypeCur.trackEvt.toLowerCase() === beaconType.toLowerCase()))
                {
                    var objTrackParams= trackTypeCur.trackParams || {},
                        trackParams= {},
                        trackURL= "";
                    for (var paramOn in objTrackParams) //jshint ignore: line
                    {
                        var paramVal = objTrackParams[paramOn];

                        if (paramVal === '{intl}'){
                            paramVal= extGlobal.browserGap.getIntl();
                        } else if (paramVal === '{ver}'){
                            paramVal = extGlobal.browserGap.getVer();
                        } else if (paramVal === '{itype}'){
                            paramVal = beaconConfig.params.itype;
                        }else if (paramVal === '{fr}'){
                            if (beaconType.toLowerCase() === "click_info") {
                                paramVal = beaconConfig.params.fr || "";
                            } else {
                                paramVal = frCode;
                            }
                        }else if (paramVal === '{ctid}'){
                            paramVal = extGlobal.browserGap.localStorage.getItem('ctid');
                        }else if (paramVal === '{defbrows}'){
                            paramVal = extGlobal.browserGap.localStorage.getItem('defbrows');
                        }else if (paramVal === '{mrkt}'){
                            paramVal = extGlobal.browserGap.getMarket();
                        }else if (paramVal === '{sec}'){
                            paramVal = beaconConfig.params.sec;
                        } else if (paramVal === '{slk}'){
                            paramVal = beaconConfig.params.slk;
                        } else if (paramVal === '{tar}'){
                            if(beaconConfig.params.tar){
                                paramVal = beaconConfig.params.tar;
                            } else{
                                paramVal = null;
                            }
                        } else if (paramVal === '{_p}'){
                            paramVal = beaconConfig.params._p;
                        } else if (paramVal === '{gpos}'){
                            paramVal = beaconConfig.params.gpos;
                        } else if (paramVal === '{cset}') {
                            if(beaconConfig.params.cset){
                                paramVal = beaconConfig.params.cset;
                            } else{
                                paramVal = null;
                            }
                        } else if (paramVal === '{mset}')
                        {
                            if(beaconConfig.params.mset){
                                paramVal = beaconConfig.params.mset;
                            } else{
                                paramVal = null;
                            }
                        } else if (paramVal === '{browser}'){
                            paramVal = beaconConfig.params.browser;
                        } else if (paramVal === '{ext}'){
                            if(beaconConfig.params.delc){
                                paramVal = beaconConfig.params.delc;
							} else {
                                paramVal = "ext";
							}
                        }
                        else if (paramVal === '{pt}'){
                            paramVal = beaconConfig.params.pt;
                        } else if (paramVal === '{tn_enable}'){
                            paramVal = beaconConfig.params.tn_enable;
                        } else if (paramVal === '{tn_num}'){
                            paramVal = beaconConfig.params.tn_num;
                        } else if (paramVal === '{storeid}'){
                            paramVal = extGlobal.browserGap.getStoreId();
                        } else if (paramVal === '{amp_desc}'){
                            paramVal = getAmpDesc();
                        } else if (paramVal === '{partner_sites}') {
                            paramVal = beaconConfig.params.partner_sites;
                        }
                        if(paramVal){
                            trackParams[paramOn] = paramVal;
                        }
                    }
                    if (trackTypeCur.useYLC)
                    {
                        trackParams[YAHOO.ULT.SRC_SPACEID_KEY]= trackTypeCur.trackSpaceID;
                        //TODO: Check if you need to replace http with https or is it already taken care of
                        trackURL= YAHOO.ULT.beacon_click(trackParams);
                    }
                    else {
                        trackParams.s = trackTypeCur.trackSpaceID.toString();
                        trackURL = ("https://geo.yahoo.com/p?t=" + Math.random());
                        for (var paramCur in trackParams) { //jshint ignore: line
                            trackURL += ("&" + paramCur + "=" + trackParams[paramCur]);
                        }
                    }
                    console.log("Track url is " + trackURL);
                    extGlobal.browserGap.xhr(trackURL, logResponse);
                    //TODO: make this not a for loop
                    break;
                }
            }
        }
        catch (e)
        {
            console.log('Tracker.sendBeacon error: ' + e.message);
        }
    }

    function initAlivePing(spaceId, browser)
    {
        var beaconConfig = {};
        var beaconParams = {};
        beaconParams.itype = extGlobal.constants.tracker_alive;
        beaconParams.browser = browser;
        if(browser === extGlobal.constants.tracker_browser_ff){
            beaconParams.cset = Services.search.currentEngine.name;
        }
        beaconConfig.params = beaconParams;
        sendAlivePing(spaceId, extGlobal.constants.tracker_page_info, beaconConfig);
    }

    function sendAlivePing(spaceId, pageInfo, beaconConfig){
        var interval = extGlobal.constants.tracker_alive_ping_interval;
        var curTime = (new Date()).getTime();
        var installTime = JSON.parse(extGlobal.browserGap.localStorage.getItem("firstRunCompletedTime")) || 0;
        if(curTime - installTime < extGlobal.constants.tracker_alive_ping_aggressive_time){
            interval = extGlobal.constants.tracker_alive_ping_aggressive_interval;
        }
        sendBeacon(spaceId, pageInfo, beaconConfig);
        setTimeout(sendAlivePing.bind(this, spaceId, pageInfo, beaconConfig), interval);
    }

    function getAmpDesc() {
        var browser = extGlobal.browserGap.isFirefox ? "ff" : (extGlobal.browserGap.isChrome ? "chr" : (extGlobal.browserGap.isSafari ? "sf" : ""));
        var distributionChannel = getDistributionChannel();
        var distributionCode = extGlobal.constants.distributionChannels[distributionChannel].amp_desc_dist || extGlobal.constants.amp_desc_dist_default;
        return extGlobal.constants.amp_desc_type + "_" + browser + "_" + distributionCode;
    }

    function getDistributionChannel() {
        var distributionChannel;
        if (extGlobal.prefService) { //firefox
            distributionChannel = extGlobal.prefService.get(extGlobal.constants.distributionChannelPrefKey);
        } else if (extGlobal.distributionChannel) { //chrome
            distributionChannel = extGlobal.distributionChannel;
        } else { // this should not be reached - sync error?
            distributionChannel = extGlobal.constants.distributionDefaultChannel;
            console.log("Could not find distribution channel, using default");
        }
        return distributionChannel;
    }

    this.initAlivePing = initAlivePing;
    this.sendBeacon = sendBeacon;

    if(unittests){
        this.sendAlivePing = sendAlivePing;
    }
}

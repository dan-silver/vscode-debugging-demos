extGlobal = {}; //jshint ignore: line
extGlobal.browserGap = new BrowserGap(true);
extGlobal.constants = new Constants();

var msg =
{
    newTab: true,
    renderNewTab: true,
    isOnline: navigator.onLine
};

var retryAttempts = 10;

var initNewTab = function (newTabData) {
    if (!newTabData && retryAttempts > 0) {
        setTimeout(function() {
            retryAttempts = retryAttempts - 1;
            extGlobal.browserGap.emitToMain(msg, initNewTab);
        }, 200);
    } else {
        if (extGlobal.browserGap.isFirefox) {
            extGlobal.browserGap.setLocalizedStrings(newTabData.localizedStrings);
            extGlobal.browserGap.market = newTabData.market;
        }
        if(extGlobal.browserGap.isSafari) {
            extGlobal.browserGap.market = newTabData.market;
        }
        extGlobal.distributionChannel = newTabData.distributionChannel || extGlobal.constants.distributionDefaultChannel;
        extGlobal.bucket = new Bucket(newTabData.bucketPermissions);
        var viewRenderer = new ViewRenderer(newTabData);
        viewRenderer.render();
        var title = document.createElement("title");
        title.textContent = extGlobal.browserGap.getLocalizedString("newtab_extension_tab_title");
        document.body.appendChild(title);

        var form = document.getElementById("submitSearchNew");

        var searchBox = form.getElementsByTagName("input").item(0);
        searchBox.setAttribute("placeholder", extGlobal.browserGap.getLocalizedString("newtab_extension_search_box_label"));
        var frInput = document.createElement("input");
        var frValue = (extGlobal.browserGap.isFirefox ? extGlobal.constants.distributionChannels[extGlobal.distributionChannel].frCodeFirefox : (extGlobal.browserGap.isSafari ? extGlobal.constants.distributionChannels[extGlobal.distributionChannel].frCodeSafari : extGlobal.constants.distributionChannels[extGlobal.distributionChannel].frCodeChrome));
        frInput.setAttribute("type", "hidden");
        frInput.setAttribute("id", "fr");
        frInput.setAttribute("name", "fr");
        frInput.setAttribute("value", frValue);

        var typeInput = document.createElement("input");
        var typeParam = extGlobal.constants.distributionChannels[extGlobal.distributionChannel].typeParam ? extGlobal.constants.distributionChannels[extGlobal.distributionChannel].typeParam : extGlobal.constants.typeParam;
        typeInput.setAttribute("type", "hidden");
        typeInput.setAttribute("id", "type");
        typeInput.setAttribute("name", "type");
        typeInput.setAttribute("value", typeParam);

        form.appendChild(frInput);
        form.appendChild(typeInput);

        var searchSuggest = new SearchSuggest(newTabData);
        searchSuggest.init();

        if(extGlobal.browserGap.isSafari) {
            document.getElementById('searchBoxNew').focus();
        }
    }
};

if(extGlobal.browserGap.isSafari) {
    // When 'back' button is clicked, you have to explcitiy render the new tab in Safari
    window.addEventListener("popstate", function(){ extGlobal.browserGap.emitToMain(msg, initNewTab); }, false);

    // For Safari, add in fade-in transition and speed the blur filter for performance improvemnts
    document.getElementById('bg').setAttribute("class", "flexContainer bgImage fade-in");
    document.getElementById('uiBlur').setAttribute("class", "speedBlur");
    document.getElementById('mainContainer').setAttribute("class", "speedBlur");
}

extGlobal.browserGap.emitToMain(msg, initNewTab);
function BrowserGap(isContentScript, unittest) { //jshint ignore: line
    var isChrome = true; //jshint ignore: line
    var topSites = [];
    var bookmarks;
    var otherBookmarks;

    function getTopSites(){
        return topSites;
    }

    function getBookmarks(){
        return bookmarks;
    }

    function getOtherBookmarks() {
        return otherBookmarks;
    }

    function refreshTopSites(){
        chrome.topSites.get(function(siteArr){
            topSites = siteArr;
        });
    }

    function addNewTabListener(listener, preInit){
        chrome.runtime.onMessage.addListener(function ( msg, sender, response) {
            if(msg.newTab) {
                listener(msg, response);
            }
        });
        chrome.runtime.onMessage.removeListener(preInit);
    }

    function emitToMain(msg, callback){
        chrome.runtime.sendMessage(msg, callback);
    }

    function xhr(url, callback, err){
        var xmlhttp = new XMLHttpRequest();
        xmlhttp.onreadystatechange = function()
        {
          if(this.readyState === XMLHttpRequest.DONE )
          {
            if(this.status === 200){
                callback(this.responseText);
            }else {
                err(this.status);
            }
          }
        };
        xmlhttp.open("GET", url, true);
        xmlhttp.send();
    }

    function getLocalizedString(key, params)
    {
        return chrome.i18n.getMessage(key);
    }

    function onceOnline(callback) {
        if(!navigator.onLine){
            window.addEventListener("online", function(callback){
                window.removeEventListener("online", this);
                callback();
            }.bind(null,callback));
        }else {
            callback();
        }
    }

    function isOnline(){
        return navigator.onLine;
    }

    function getUILanguage(){
        return chrome.i18n.getUILanguage();
    }

    function getVer(){
        return chrome.runtime.getManifest().version;
    }

    function getStoreId(){
        return chrome.runtime.id || "";
    }

    function loadTrackingParams()
    {
        //TODO: move this logic to tracking js
        if(!localStorage.getItem('ctid'))
        {
            getInstallerClue("ctid", 0, function(ctid){
                localStorage.setItem('ctid', ctid);
            });
        }
        if(!localStorage.getItem('defbrows'))
        {
            getInstallerClue("defbrows", 0, function(defbrows){
                localStorage.setItem('defbrows', defbrows);
            });
        }
    }

    function getInstallerClue(clue, attempt, callback){
        var self = this;
        if(attempt >= extGlobal.constants.clueAttemptCount){
            console.log("giving up trying to find a clue");
            if(clue === "ctid"){
                callback(generateCTID());
            }
            if(clue === "defbrows"){
                callback("unk");
            }
            return false;
        }
        chrome.runtime.getPackageDirectoryEntry(function(directoryEntry) {
            var directoryReader = directoryEntry.createReader();
            // List of DirectoryEntry and/or FileEntry objects.
            var filenames = [];
            (function readNext() {
                directoryReader.readEntries(function(entries) {
                    if (entries.length) {
                        for (var i = 0; i < entries.length; ++i) {
                            filenames.push(entries[i].name);
                        }
                        readNext();
                    } else {
                        var clueFound = false;
                        var regexClue = new RegExp(clue);
                        for(var item = 0; item < filenames.length; item++){
                            if(regexClue.test(filenames[item])){
                                clueFound = true;
                                callback(filenames[item].replace(clue+"-", ""));
                            }
                        }
                        if(!clueFound){
                            console.log("no clue found. trying again: "+attempt+"/"+extGlobal.constants.clueAttemptCount);
                            setTimeout(getInstallerClue.bind(self, clue,  ++attempt, callback), extGlobal.constants.clueAttemptTimeout);
                        }
                    }
                });
            })();
        });
    }

    function generateCTID()
    {
        var strUUID= "";
        try
        {
            var timeSeed= ((new Date()).getTime()).toString();
            timeSeed= timeSeed.substr(timeSeed.length - 3);
            for (var seedOn= 0; seedOn < timeSeed; seedOn++){
                Math.random();
            }

            for (var charOn= 0; charOn < 32; charOn++)
            {
                var charCur= Math.floor(Math.random() * 36);
                if (charCur > 25){
                    charCur= String.fromCharCode(48 + charCur - 26);
                } else{
                    charCur= String.fromCharCode(65 + charCur);
                }

                strUUID += charCur;

                switch (charOn)
                {
                    case 7:
                    case 11:
                    case 15:
                    case 19:
                        strUUID += '-';
                        break;
                }
            }
        }
        catch (e)
        {
            console.log('BrowserGap.generateCTID error: ' + e.message);
        }
        return strUUID;
    }

    function init()
    {
        if (!chrome.topSites) { //when going to a URL then clicking back quickly, sometimes Chrome has a bug and does not have the topSites json object
            location.reload();
        } else {
            refreshTopSites();
            isContentScript? true: window.setInterval(refreshTopSites,extGlobal.constants.topSitesRefreshTime);
        }
    }
    if(unittest){
        this.topSites = topSites;
        this.getTopSites = getTopSites;
        this.refreshTopSites = refreshTopSites;
        this.addNewTabListener = addNewTabListener;
        this.emitToMain = emitToMain;
        this.xhr = xhr;
        this.getLocalizedString = getLocalizedString;
        this.onceOnline = onceOnline;
        this.isOnline = isOnline;
        this.getUILanguage = getUILanguage;
        this.getVer = getVer;
        this.loadTrackingParams = loadTrackingParams;
        this.generateCTID = generateCTID;
        this.init = init;
        this.syncDataBrowserGapToUnitTestCase = function(){
            this.topSites = topSites;
        };
        this.syncDataUnitTestCaseToBrowserGap = function(){
            topSites = this.topSites;
            refreshTopSites = this.refreshTopSites; // jshint ignore: line
        };
        return this;
    }

    init();
    this.getTopSites = getTopSites;
    this.getBookmarks = getBookmarks;
    this.getOtherBookmarks = getOtherBookmarks;
    this.addNewTabListener = addNewTabListener;
    this.emitToMain = emitToMain;
    this.getLocalizedString = getLocalizedString;
    this.localStorage = window.localStorage;
    this.xhr = xhr;
    this.onceOnline = onceOnline;
    this.setTimeout = setTimeout;
    this.isOnline = isOnline;
    this.isChrome = true;
    this.getMarket = getUILanguage;
    this.getIntl = getUILanguage;
    this.getVer = getVer;
    this.getStoreId = getStoreId;
    this.loadTrackingParams = loadTrackingParams;
    return this;
}

function SearchSuggest(newTabData, unittests){ // jshint ignore: line
    var suggIndex = extGlobal.constants.initialSuggestIndex,
        originalSearch = "",
        displayCount = extGlobal.constants.suggestionDisplayCount,
        viewUtils = new ViewUtils(),
        searchSuggPath =  extGlobal.browserGap.getLocalizedString("newtab_extension_search_suggest_path"),
        searchSuggPathPart1 = unittests ? "part1?command=" : searchSuggPath.split("{")[0],
        searchSuggPathPart2 = unittests ? "&part2=" : searchSuggPath.split("}")[1],
        url = "https://" + extGlobal.browserGap.getLocalizedString("newtab_extension_search_suggest_domain") + "/" +
            searchSuggPathPart1 + "{searchTerms}" + searchSuggPathPart2 + displayCount,
        searchBox = document.getElementById("searchBoxNew"),
        searchSuggestContainer = document.querySelector(".searchSuggestContainerNew"),
        topSitesContainer = document.querySelector(".newTopSitesContainer"),
        submitSearch = document.getElementById("submitSearchNew"),
        uiBlurTop = document.getElementById("uiBlur"),
        previousInput = "",
        suggestTopSite = false,
        suggestTopSiteUrl = "";

    function init(){
        searchBox.onkeydown = handleKeyNavigation;
        submitSearch.addEventListener('submit',submitForm,true);

        // handling resizing for blur effect on autosuggest box
        if (window.addEventListener) {
            window.addEventListener('resize', function() {
                viewUtils.clipToElement("#uiBlur", document.querySelector("#searchSuggestContainerNew"));
            });

            window.addEventListener('click', function(e) {
                if (searchBox.value !== "" && e.target.parentNode && e.target.parentNode.id !== "submitSearchNew" && (e.target.parentNode.className || "").indexOf("suggestion") === -1) {
                    // if user clicks out of search bar or autosuggest when there is a query, we want to hide the autosuggest
                    viewUtils.hideElement(searchSuggestContainer); //hiding auto suggest
                    uiBlurTop.style.visibility = "hidden";
                } else if (searchBox.value !== "") {
                    suggestResults(searchBox.value);
                }
            });
        }
    }

    function suggestResults(searchTerms){
        var possibleTopSite = [],
             searchInput = document.getElementById("searchBoxNew");
        if (newTabData.enableTopSiteSuggest) {
            for (var i=0;newTabData.topSites && i<newTabData.topSites.length && searchTerms.length > previousInput.length; i++) {
                if (newTabData.topSites[i].url.startsWith(searchTerms) ||
                    newTabData.topSites[i].url.replace(/http(s)?:\/\//, "").startsWith(searchTerms) ||
                    newTabData.topSites[i].url.replace(/(http(s)?:\/\/|www.)/g, "").startsWith(searchTerms)) {
                    possibleTopSite.push(newTabData.topSites[i]);
                }
            }
            suggestTopSite = false;
            suggestTopSiteUrl = "";
            if (possibleTopSite.length >= 1) {
                var startIndex = -1,
                    urlCompletion;
                if (possibleTopSite[0].url.indexOf(searchTerms) === 0) {
                    startIndex = 0; //case where user starts by typing "http"
                } else if (possibleTopSite[0].url.replace(/http(s)?:\/\//, "").indexOf(searchTerms) === 0) {
                    startIndex = possibleTopSite[0].url.indexOf("://") + 3; //case the user starts by typing www.[something]
                } else if (possibleTopSite[0].url.replace(/(http(s)?:\/\/|www.)/g, "").indexOf(searchTerms) === 0) {
                    startIndex = possibleTopSite[0].url.indexOf("://www.") + 7; //case the user starts by directly typing the server name, i.e. something.com
                }
                if (startIndex > -1) {
                    urlCompletion = possibleTopSite[0].url.substring(startIndex + searchTerms.length, possibleTopSite[0].url.length);
                    searchInput.value = searchTerms + urlCompletion;
                    if (searchInput.value.charAt(searchInput.value.length-1) === "/") {
                        searchInput.value = searchInput.value.substring(0, searchInput.value.length -1);
                    }
                    searchInput.setSelectionRange(searchInput.value.indexOf(searchTerms) + searchTerms.length, searchInput.value.length);
                    suggestTopSite = true;
                    suggestTopSiteUrl = possibleTopSite[0].url;
                }
            }
        }
        var suggestions = [],
            suggestUrl = url.replace("{searchTerms}", encodeURIComponent(searchTerms)),
            self = this;
        self.searchTerms = searchTerms;
        var stateChange = (function (responseText){
            if(searchBox.value === ""){
                viewUtils.hideElement(searchSuggestContainer);
                viewUtils.unhideElement(topSitesContainer);
                uiBlurTop.style.visibility = "hidden";
            } else if(this.searchTerms === searchBox.value || this.searchTerms === previousInput) {
                suggIndex = extGlobal.constants.initialSuggestIndex;
                suggestions = formatResults(responseText);
                renderSuggestions(suggestions, searchSuggestContainer, displayCount);
            }
        }).bind(self);
        extGlobal.browserGap.xhr(suggestUrl, stateChange, null);
        previousInput = searchTerms;

    }

    function formatResults(responseText){
        var results = JSON.parse(responseText);
        var suggestions = [];
        if(results.r){
            //results are in the alt format
            for(var i = 0; i < results.r.length; i++){
                suggestions.push(results.r[i].k);
            }
        }else{
            //results are in standard format
            suggestions = results[1];
        }
        return suggestions;
    }

    function setMouseOver (div, i) {
        div.onmouseover = handleMouseHover.bind(null, i);
    }

    function renderSuggestions(suggestions, parentElement, displayCount) {
        var cssBlur = new CssGenerator("viewRenderer", true);
        var searchBox = document.getElementById("searchBoxNew") || {};
        var searchTerm = searchBox.value || "";

        if(suggestions.length > 0){
            viewUtils.unhideElement(searchSuggestContainer);
            viewUtils.clearInnerHTML(parentElement);

            var numberOfSuggestions = suggestions.length < displayCount ? suggestions.length : displayCount;
            for(var i=0; i<numberOfSuggestions; i++){
                var searchSuggestDiv = document.createElement("div");
                var searchSuggestText = document.createElement("div");
                var searchSuggestTextBold = document.createElement("span");
                var searchSuggestTextNormal = document.createElement("span");

                //if the mouse is already hovering we don't want the selection to be immediately selected
                //so we'll only bind the mouseover function 50ms after rendering to avoid such behavior
                setTimeout(setMouseOver.bind(null, searchSuggestDiv, i), 50);
                searchSuggestDiv.onmouseout = handleMouseOut.bind(null);
                searchSuggestDiv.onclick = navToSearch.bind(null, suggestions[i]);
                searchSuggestDiv.setAttribute("class","suggestion");
                searchSuggestText.setAttribute("class","suggestionText");
                if (suggestions[i].substring(0, searchTerm.length).toLowerCase() === searchTerm.toLowerCase()) {
                    searchSuggestTextNormal.textContent = suggestions[i].substring(0, searchTerm.length);
                    searchSuggestTextBold.textContent = suggestions[i].substring(searchTerm.length, suggestions[i].length);
                    searchSuggestTextBold.setAttribute("class", "bold");
                    searchSuggestText.appendChild(searchSuggestTextNormal);
                    searchSuggestText.appendChild(searchSuggestTextBold);
                } else { //sometimes suggestion does not match query, ex: query=lalala and suggestion=la la la la - so no bolding in that case
                    searchSuggestTextNormal.textContent = suggestions[i];
                    searchSuggestText.appendChild(searchSuggestTextNormal);
                }

                searchSuggestDiv.appendChild(searchSuggestText);
                parentElement.appendChild(searchSuggestDiv);

            }
            var uiBlur = document.getElementById("uiBlur");
            var bgImage = document.getElementById("bg");
            document.getElementById("uiBlur").style.visibility = "visible";
            viewUtils.clipToElement("#uiBlur", document.querySelector("#searchSuggestContainerNew"));
            uiBlur.setAttribute("class", "bgImage");
        } else{
            viewUtils.hideElement(searchSuggestContainer);
            viewUtils.unhideElement(topSitesContainer);

        }
    }

    function navToSearch(suggestion){
        var url = viewUtils.getSearchUrl(suggestion);

        /*Send a click tracking ping for a search submitted through the newtab page search suggestions*/
        var beaconConfig = {};
        var beaconParams = {};
        beaconParams.sec = searchSuggestContainer.getAttribute("id");
        beaconParams.slk = extGlobal.constants.tracker_searchArea_slk_search_suggestion;
        beaconParams.tar = url;
        beaconParams.gpos = extGlobal.constants.tracker_gpos_search_box;
        beaconParams._p = extGlobal.constants.tracker_searchArea_p_search_suggestion;
        beaconConfig.params = beaconParams;
        extGlobal.browserGap.emitToMain({newTab: true, tracker: true, beaconConfig: beaconConfig});

        navigate(url);
        if(unittests){
            return url;
        }
    }

    function submitForm(event){
        var beaconConfig = {};
        var beaconParams = {};
        var searchBox = document.getElementById("searchBoxNew");
        if (suggestTopSite && suggestTopSiteUrl.length > 0) {
            event.preventDefault();
            beaconParams.sec = searchBox.getAttribute("id");
            beaconParams.slk = extGlobal.constants.tracker_searchArea_slk_search_box;
            beaconParams.tar = suggestTopSiteUrl;
            beaconParams.gpos = extGlobal.constants.tracker_gpos_search_box;
            beaconParams._p = extGlobal.constants.tracker_searchArea_p_search_box;
            beaconConfig.params = beaconParams;
            extGlobal.browserGap.emitToMain({newTab: true, tracker: true, beaconConfig: beaconConfig});
            navigate(suggestTopSiteUrl);
        } else {
            //block default submit behavior
            event.preventDefault();
            viewUtils.hideElement(searchSuggestContainer);
            viewUtils.unhideElement(topSitesContainer);
            var url = viewUtils.getSearchUrl(searchBox.value);

            /*Send a click tracking ping for a search submitted through the newtab page search box*/
            /*We need to send searchBox type of tracking ping here*/
            if(originalSearch === searchBox.value){
                beaconParams.sec = searchBox.getAttribute("id");
                beaconParams.slk = extGlobal.constants.tracker_searchArea_slk_search_box;
                beaconParams.tar = url;
                beaconParams.gpos = extGlobal.constants.tracker_gpos_search_box;
                beaconParams._p = extGlobal.constants.tracker_searchArea_p_search_box;
            }
            /*We need to send search suggest type of tracking ping here*/
            else{
                beaconParams.sec = searchSuggestContainer.getAttribute("id");
                beaconParams.slk = extGlobal.constants.tracker_searchArea_slk_search_suggestion;
                beaconParams.tar = url;
                beaconParams.gpos = extGlobal.constants.tracker_gpos_search_box;
                beaconParams._p = extGlobal.constants.tracker_searchArea_p_search_suggestion;
            }
            beaconConfig.params = beaconParams;
            extGlobal.browserGap.emitToMain({newTab: true, tracker: true, beaconConfig: beaconConfig});

            navigate(url);
            if(unittests){
                return url;
            }
        }
    }

    function handleMouseHover(index){
        suggIndex = index;
        highlightSuggestion(index);

        if(unittests){
            return suggIndex;
        }
    }

    function handleMouseOut(e){
        suggIndex = -1;
        clearHighlightSuggestion();

        if(unittests){
            return suggIndex;
        }
    }

    function handleKeyNavigation(e){
        var len = this.value.length;

        switch(e.which){
            case extGlobal.constants.keycode_up:
                this.setSelectionRange(len, len);
                e.preventDefault();
                highlightSuggestion(changeHighlight(-1));
                break;
            case extGlobal.constants.keycode_down:
                this.setSelectionRange(len, len);
                e.preventDefault();
                highlightSuggestion(changeHighlight(1));
                break;
        }
    }

    function highlightSuggestion(index){
        clearHighlightSuggestion();
        if(index >= 0){ //'highlighting' the search box is index -1
            var sugg = document.getElementsByClassName("suggestionText")[index];
            sugg.classList.add("suggSelNew");
            searchBox.value = sugg.textContent;
        }else{
            searchBox.focus();
        }
    }

    function clearHighlightSuggestion(){
        var suggestions = document.getElementsByClassName("suggSelNew"),
            i;
        for(i = 0; i < suggestions.length; i++){
            suggestions[i].classList.remove("suggSelNew");
        }
    }

    function changeHighlight(delta){
        var len = document.getElementsByClassName("suggestionText").length;
        suggIndex += delta;
        if(suggIndex < -1){
            suggIndex = len-1;
        }
        if(suggIndex >= len){
            suggIndex = -1;
        }
        if(suggIndex === -1){
            document.getElementById("searchBoxNew").value = originalSearch;
        }
        return suggIndex;
    }

    function navigate(url){
        window.location = url;
    }

    searchBox.oninput = function(e) {
        originalSearch = this.value;
        suggestResults(searchBox.value);
    };

    /* jshint ignore: start */
    if(unittests){
        this.suggestResults = suggestResults;
        this.formatResults = formatResults;
        this.renderSuggestions = renderSuggestions;
        this.navToSearch = navToSearch;
        this.submitForm = submitForm;
        this.highlightSuggestion = highlightSuggestion;
        this.clearHighlightSuggestion = clearHighlightSuggestion;
        this.changeHighlight = changeHighlight;
        this.handleMouseHover = handleMouseHover;
        this.handleMouseOut = handleMouseOut;
        this.handleKeyNavigation = handleKeyNavigation;
        this.suggIndex = suggIndex;
        this.navigate = navigate;

        this.injectFunctions = function(){
            highlightSuggestion = this.highlightSuggestion;
            clearHighlightSuggestion = this.clearHighlightSuggestion;
            changeHighlight = this.changeHighlight;
            navigate = this.navigate;
        }
    }
    /* jshint ignore: end */

    this.init = init;
    return this;
}
function CssGenerator(id, autoGenerate, unittests){ //jshint ignore: line
    var styleElement = document.getElementById(id);
    var css = {};

    function init(){
        if(!styleElement){
            styleElement = document.createElement("style");
            styleElement.setAttribute("id", id);

            document.querySelector("head").appendChild(styleElement);
        }
    }

    function addSelector(selector, keys){
        css[selector] = {
            keys: keys
        };
        if(autoGenerate){
            generateCss();
        }
    }

    function editSelectorKeyValue(selector, key, value){
        css[selector].keys[key] = value;
        if(autoGenerate){
            generateCss();
        }
    }

    function removeSelector(selector){
        delete css[selector];
        if(autoGenerate){
            generateCss();
        }
    }

    function generateCss(){
        var result ="";
        for(var selector in css){
            if (css.hasOwnProperty(selector)) {
                result += selector+"{";
                for(var key in css[selector].keys){
                    if (css[selector].keys.hasOwnProperty(key)) {
                        result += key+': '+css[selector].keys[key]+';';
                    }
                }
                result += "}";
            }
        }
        styleElement.innerHTML = result;
    }

    this.addSelector = addSelector;
    this.editSelectorKeyValue = editSelectorKeyValue;
    this.removeSelector = removeSelector;
    this.generateCss = generateCss;
    this.init = init;
    if(unittests){
        this.css = css;
        this.styleElement = styleElement;
        this.syncData = function(){
            css = this.css;
            styleElement = this.styleElement;
            console.log(css);
        };
    }
    return this;
}

function ViewRenderer(newTabData, unittest){ //jshint ignore: line
    var viewUtils = new ViewUtils();
    var currSitesPerRow = 0;
    var maxTitleLength = 20;
    var showFullImage = false;
    var maxSites = 9;
    var offlinePhotosIdx = localStorage.getItem("offlinePhotosIdx") || 0;

    var css = new CssGenerator("viewRenderer", true);
    css.init();
    var cssBlur = new CssGenerator("blur", true);
    var sitesBlackList = JSON.parse(localStorage.getItem('sitesBlackList')) || [];
    var editModeToggle = true;
    var isEditModeOn = false;
    cssBlur.init();
    var frValue = (extGlobal.browserGap.isFirefox ? extGlobal.constants.distributionChannels[extGlobal.distributionChannel].frCodeFirefox : (extGlobal.browserGap.isSafari ? extGlobal.constants.distributionChannels[extGlobal.distributionChannel].frCodeSafari : extGlobal.constants.distributionChannels[extGlobal.distributionChannel].frCodeChrome));
    var typeParam = extGlobal.constants.distributionChannels[extGlobal.distributionChannel].typeParam ? extGlobal.constants.distributionChannels[extGlobal.distributionChannel].typeParam : extGlobal.constants.typeParam;
    var partners = [
        {
            title: "Yahoo",
            url: "https://www.yahoo.com?fr=" + frValue + "&type=" + typeParam,
            position: "left"
        }
    ];

    var partnerUrls = [];
    var defaultUrls = [];
    var defaultSitesText = [];
    var subDomainBlackList = ["www","corp"];
    var topIcons = {
        adobe : "adobe",
        airbnb : "airbnb",
        amazon : "amazon",
        aol : "aol",
        apple : "apple",
        bankofamerica : "bankofamerica",
        bbc : "bbc",
        behance : "behance",
        bestbuy : "bestbuy",
        bing : "bing",
        careersyahoo : "careersyahoo",
        chase : "chase",
        cnn : "cnn",
        codepen : "codepen",
        craigslist : "craigslist",
        dailymotion : "dailymotion",
        dribbble : "dribbble",
        dropbox : "dropbox",
        ebay : "ebay",
        espn : "espn",
        evernote : "evernote",
        facebook : "facebook",
        financeyahoo : "financeyahoo",
        flickr : "flickr",
        foxnews : "foxnews",
        gamesyahoo : "gamesyahoo",
        gettyimages : "gettyimages",
        github: "github",
        gmail : "gmail",
        google : "google",
        googledocs : "googledocs",
        docsgoogle : "googledocs",
        googledrive : "googledrive",
        drivegoogle : "googledrive",
        googleinbox : "googleinbox",
        inboxgoogle : "googleinbox",
        googlemaps : "googlemaps",
        mapsgoogle : "googlemaps",
        googleplay : "googleplay",
        playgoogle: "googleplay",
        googlesheets : "googlesheets",
        sheetsgoogle: "googlesheets",
        googlewebstore : "googlewebstore",
        webstoregoogle : "googlewebstore",
        grooveshark : "grooveshark",
        homedepot : "homedepot",
        homesyahoo : "homesyahoo",
        imdb: "imdb",
        instagram : "instagram",
        java : "java",
        jsfiddle : "jsfiddle",
        kickstarter : "kickstarter",
        linkedin : "linkedin",
        magnifier : "magnifier",
        mailyahoo : "mailyahoo",
        mapquest : "mapquest",
        mashable : "mashable",
        medium : "medium",
        metacafe : "metacafe",
        mixbit: "mixbit",
        msn : "msn",
        nationalgeographic : "nationalgeographic",
        netflix : "netflix",
        newsyahoo : "newsyahoo",
        oracle : "oracle",
        oracleapp : "oracleapp",
        pandora : "pandora",
        paypal : "paypal",
        pintrest : "pintrest",
        rdio : "rdio",
        screenyahoo : "screenyahoo",
        shoppingyahoo : "shoppingyahoo",
        slideshare: "slideshare",
        soundcloud : "soundcloud",
        sportsyahoo : "sportsyahoo",
        spotify : "spotify",
        target : "target",
        techcrunch : "techcrunch",
        ted : "ted",
        theverge : "theverge",
        time : "time",
        tumblr : "tumblr",
        turbotax : "turbotax",
        twitch : "twitch",
        twitter : "twitter",
        vimeo : "vimeo",
        vine : "vine",
        walmart : "walmart",
        weatherchannel : "weatherchannel",
        weatheryahoo : "weatheryahoo",
        wellsfargo : "wellsfargo",
        wikipedia : "wikipedia",
        wordpress : "wordpress",
        yahoo : "yahoo",
        yahooautos : "yahooautos",
        autosyahoo : "yahooautos",
        yahoofood : "yahoofood",
        foodyahoo : "yahoofood",
        yahoomatch : "yahoomatch",
        matchyahoo : "yahoomatch",
        yahootech : "yahootech",
        techyahoo : "yahootech",
        yahootravel : "yahootravel",
        travelyahoo : "yahootravel",
        youtube : "youtube",
        befrugal: "befrugal"
    };
    var siteWhitelist = {
        "facebook.com": {
            "color": "#3B5998",
            "title": "Facebook",
            "shortTitle": "Fb"
        },
        "news.yahoo.com": {
            "color": "#400090",
            "title": "Yahoo News",
            "shortTitle": "YN"
        },
        "spotify.com": {
            "color": "#8DC100",
            "title": "Spotify",
            "shortTitle": "Sp"
        },
        "github.com": {
            "color": "#000000",
            "title": "GitHub",
            "shortTitle": "Gh"
        },
        "yahoo.monday.com.tw": {
            "color": "#400090",
            "title": "Yahoo!奇摩購物中心",
            "shortTitle": "購"
        },
        "search.yahoo.com": {
            "color": "#400090",
            "title": "Yahoo Search",
            "shortTitle": "YS"
        },
        "yahoo.com": {
            "color": "#400090",
            "title": "Yahoo",
            "shortTitle": "Ya"
        },
        "google.com": {
            "color": "#4583EC",
            "title": "Google",
            "shortTitle": "Go"
        },
        "youtube.com": {
            "color": "#CC181E",
            "title": "YouTube",
            "shortTitle": "YT"
        },
        "gmail.com": {
            "color": "#4583EC",
            "title": "Gmail",
            "shortTitle": "Gm"
        },
        "mail.yahoo.com": {
            "color": "#400090",
            "title": "Yahoo Mail",
            "shortTitle": "YM"
        },
        "mail.google.com": {
            "color": "#4583EC",
            "title": "Gmail",
            "shortTitle": "Gm"
        },
        "netflix.com": {
            "color": "#E50914",
            "title": "Netflix",
            "shortTitle": "Ne"
        },
        "google.ca": {
            "color": "#4583EC",
            "title": "Google",
            "shortTitle": "Go"
        },
        "google.co.th": {
            "color": "#4583EC",
            "title": "Google",
            "shortTitle": "Go"
        },
        "google.co.in": {
            "color": "#4583EC",
            "title": "Google",
            "shortTitle": "Go"
        },
        "google.co.uk": {
            "color": "#4583EC",
            "title": "Google",
            "shortTitle": "Go"
        },
        "amazon.com": {
            "color": "#242F41",
            "title": "Amazon",
            "shortTitle": "Am"
        },
        "cnn.com": {
            "color": "#CB0000",
            "title": "CNN",
            "shortTitle": "CN"
        },
        "edition.cnn.com": {
            "color": "#CB0000",
            "title": "CNN",
            "shortTitle": "CN"
        },
        "tumblr.com": {
            "color": "#36465D",
            "title": "Tumblr",
            "shortTitle": "Tu"
        },
        "twitter.com": {
            "color": "#1DA1F2",
            "title": "Twitter",
            "shortTitle": "YS"
        },
        "ebay.com": {
            "color": "#85B716",
            "title": "eBay",
            "shortTitle": "eB"
        },
        "msn.com": {
            "color": "#F4F4F2",
            "title": "msn",
            "shortTitle": "ms"
        },
        "wellsfargo.com": {
            "color": "#BE191D",
            "title": "Wells Fargo",
            "shortTitle": "WF"
        },
        "aol.com": {
            "color": "#457CB5",
            "title": "AOL",
            "shortTitle": "AO"
        },
        "apps.facebook.com": {
            "color": "#3B5998",
            "title": "Facebook",
            "shortTitle": "Fb"
        },
        "flickr.com": {
            "color": "#161617",
            "title": "Flickr",
            "shortTitle": "Fl"
        },
        "chrome.google.com": {
            "color": "#4583EC",
            "title": "Chrome",
            "shortTitle": "Ch"
        },
        "instagram.com": {
            "color": "#8A3BBB",
            "title": "Yahoo",
            "shortTitle": "YS"
        },
        "linkedin.com": {
            "color": "#1D87BE",
            "title": "LinkedIn",
            "shortTitle": "Li"
        },
        "bing.com": {
            "color": "#www.bing.com",
            "title": "Bing",
            "shortTitle": "Bi"
        },
        "pandora.com": {
            "color": "#005484",
            "title": "Bing",
            "shortTitle": "Bi"
        }
    };
    var firstExperienceSites = [
        {
            title: "Yahoo",
            url: "https://www.yahoo.com?fr=" +
            frValue +
            "&type=" + typeParam
        },
        {
            title: "Flickr",
            url: "https://www.flickr.com"
        },

        {
            title: "Tumblr",
            url: "https://www.tumblr.com"
        },
        {
            title: "Facebook",
            url: "https://www.facebook.com"
        },
        {
            title: "Youtube",
            url: "https://www.youtube.com"
        }

    ];



    var defaultSites = [
        {
            title: "Flickr",
            url: "https://www.flickr.com"
        },

        {
            title: "Tumblr",
            url: "https://www.tumblr.com"
        },

        {
            title: "Yahoo Mail",
            url: "https://mail.yahoo.com"
        },
        {
            title: "Amazon",
            url: "https://www.amazon.com"
        },
        {
            title: "CNN",
            url: "http://www.cnn.com"
        },
        {
            title: "Facebook",
            url: "https://www.facebook.com"
        },
        {
            title:"Wikipedia",
            url: "https://www.wikipedia.org"
        },
        {
            title: "Walmart",
            url: "https://www.walmart.com"
        }

    ];
    var offlinePhotos =
        [
            {
                title:"New Mexico Sands",
                owner:"126360766@N06",
                url_l:"offlinephotos/newmexico.jpg",
                dataURL:"offlinephotos/newmexico.jpg",
                ownername:"Suraj Saripalli"
            },
            {
                title:"San Diego Sunset",
                owner:"126360766@N06",
                url_l:"offlinephotos/sunset.jpg",
                dataURL:"offlinephotos/sunset.jpg",
                ownername:"Suraj Saripalli"
            },
            {
                title:"Colorful Antelope",
                owner:"126360766@N06",
                url_l:"offlinephotos/antelope.jpg",
                dataURL:"offlinephotos/antelope.jpg",
                ownername:"Suraj Saripalli"
            },
            {
                title:"Alaskan Winter",
                owner:"126360766@N06",
                url_l:"offlinephotos/alaska.jpg",
                dataURL:"offlinephotos/alaska.jpg",
                ownername:"Suraj Saripalli"
            }
        ];

    //var colorList = ["#1E90FF", "#228B22", "#FF0000", "#FFA500", "#4B0082", "#B0C4DE", "#008B8B", "#E9967A", "#F0E68C"]; //blue, green, red, orange, purple, steelblue, darkcyan, paleyellow, cornsilk
    //var colorList = ["#1A0808", "#8D9691", "#BC571D", "#181B12", "#D3B57E", "#5A4438", "#560308", "#9BA77F", "#39363F"]; //Inception palette
    var colorList = ["#C77F24", "#CB5A5C", "#740919", "#632016", "#A53A14", "#BB6550", "#C6AA9B", "#9A9363", "#845E19"]; //Alice Through the Looking Glass palette

    newTabData = populateMissingData(newTabData);

    //Navigate to a site
    function navToSite(site, siteDivId, siteTitle){
        //Track the click on the topsite
        if(!isEditModeOn)
        {
            //hideUrl();
            var beaconConfig = {};
            var beaconParams = {};
            if (site.indexOf("http://") === -1 && site.indexOf("https://") === -1) {
                site = "http://" + site;
            }
            beaconParams.sec = siteDivId;
            beaconParams.slk = siteTitle;
            beaconParams.tar = site;
            beaconParams.gpos = extGlobal.constants.tracker_gpos_topsites;
            beaconParams._p = siteDivId.split("_")[1];
            beaconConfig.params = beaconParams;
            console.log("Tracker: emitting to main");
            extGlobal.browserGap.emitToMain({newTab: true, tracker: true, beaconConfig: beaconConfig});

            redirectTo(site);
        }
    }

    //Redirect to a site
    function redirectTo(site){
        window.location = site;
    }

    //helper to trim a long string
    function shortenString(str, maxLength){
        if(str.length > maxLength)
        {
            str = str.slice(0, maxLength).trimRight();
            if(str[maxLength-1] !== "."){
                str = str+"...";
            }
        }
        return str;
    }

    //If some argument newTabData misses some information, will set a default value for them
    function populateMissingData(newTabData){
        if(newTabData === null || typeof(newTabData) === "undefined")
        {
            newTabData = {};
        }
        if(typeof(newTabData.backgroundPhoto) === "undefined" && (extGlobal.browserGap.isChrome || extGlobal.browserGap.isSafari))
        {
            newTabData.backgroundPhoto = offlinePhotos[offlinePhotosIdx++];
            offlinePhotosIdx = offlinePhotosIdx%offlinePhotos.length;
            localStorage.setItem("offlinePhotosIdx",offlinePhotosIdx);
        }
        if(typeof(newTabData.topSites) === "undefined") {
            newTabData.topSites = [];
        }
        return newTabData;
    }

    //Render background image;
    function renderBackground(){
        var imageBackground = document.getElementById("bg");
        var source = "";
        if(newTabData.backgroundPhoto){
            source = newTabData.backgroundPhoto.url_k || newTabData.backgroundPhoto.url_l || newTabData.backgroundPhoto.url_m;
            var readyStateCheckInterval = setInterval(function() {
            if (document.readyState === "complete") {
                clearInterval(readyStateCheckInterval);
                css.addSelector(".bgImage", {"background-image": "url("+source+")"});
            }
        }, 10);
        }else {
            imageBackground.setAttribute("class", imageBackground.getAttribute("class")+" offlineBG");
        }
    }

    //display (and link) the owner of the background image
    function renderOwnerData(){
        if(newTabData.backgroundPhoto && newTabData.backgroundPhoto.ownername){
            var ownerLink = document.getElementById("ownerName");
            var onFlickr = document.getElementById("onFlickr");

            onFlickr.setAttribute("href", "https://flickr.com");
            ownerLink.setAttribute("href", "https://flickr.com/photos/"+newTabData.backgroundPhoto.owner);

            onFlickr.onclick = function(){
                var beaconConfig = {};
                var beaconParams = {};
                beaconParams.sec = onFlickr.getAttribute("id");
                beaconParams.slk = onFlickr.getAttribute("id"); // Ideally slk should contain the ui text, but we are doing this hack as FLickr is an svg here.
                beaconParams.tar = onFlickr.getAttribute("href");
                beaconParams.gpos = extGlobal.constants.tracker_gpos_flickr;
                beaconParams._p = extGlobal.constants.tracker_flickrArea_p_flickrlogo;
                beaconConfig.params = beaconParams;
                extGlobal.browserGap.emitToMain({newTab: true, tracker: true, beaconConfig: beaconConfig});
            };
            ownerLink.onclick = function() {
                var beaconConfig = {};
                var beaconParams = {};
                beaconParams.sec = ownerLink.getAttribute("id");
                beaconParams.slk = ownerLink.textContent;
                beaconParams.tar = ownerLink.getAttribute("href");
                beaconParams.gpos = extGlobal.constants.tracker_gpos_flickr;
                beaconParams._p = extGlobal.constants.tracker_flickrArea_p_owner;
                beaconConfig.params = beaconParams;
                extGlobal.browserGap.emitToMain({newTab: true, tracker: true, beaconConfig: beaconConfig});
            };

            var photoLabel = newTabData.backgroundPhoto.ownername;
            ownerLink.textContent = photoLabel;
            onFlickr.textContent = " " + extGlobal.browserGap.getLocalizedString("newtab_extension_on_flickr") + " ";

            appendFlickrLogo(onFlickr);
        }
    }

    function toggleTN () {
        var aTN = document.getElementById("toggleTN"),
            trendingDiv = document.getElementById("searchTrendingNowContainer");
        if (trendingDiv.style.display !== "none") {
            trendingDiv.style.display = "none";
            localStorage.setItem("trendingBar", "hidden");
            aTN.textContent = extGlobal.browserGap.getLocalizedString("newtab_extension_show_tn");
        } else {
            trendingDiv.style.display = "block";
            localStorage.setItem("trendingBar", "visible");
            aTN.textContent = extGlobal.browserGap.getLocalizedString("newtab_extension_hide_tn");
        }
    }

    function renderTrendingNow () {
        var enableTN = newTabData.enableTN || false;
        var winWidth = window.innerWidth || 0;
        var tnLabelWidth = 0;
        var tnWrapperWidth = 0;
        var tnItems = [];
        var tnItemsWidth = [];
        var label, i, thisTerm, trendingNowContainer, tnWrapper, data, getTrendingNowUrl, itemTag;

        if (typeof newTabData.trendingNowData === "undefined" || !newTabData.trendingNowData || !enableTN) {
            return;
        }

        trendingNowContainer = document.getElementById("searchTrendingNowContainer");
        data = JSON.parse(newTabData.trendingNowData);
        getTrendingNowUrl = viewUtils.getTrendingNowUrl;
        itemTag = getTrendingNowUrl ? "a" : "span";

        if (data && Array.isArray(data.items) && data.items.length > 0 && trendingNowContainer) {
            label = document.createElement("span");
            label.className = "tnLabel";
            label.textContent = extGlobal.browserGap.getLocalizedString("newtab_extension_trending_now_label");
            trendingNowContainer.appendChild(label);
            tnLabelWidth = parseInt(window.getComputedStyle(label).width || 0, 10);

            tnWrapper = document.createElement("div");
            tnWrapper.className = "tnWrapper";
            trendingNowContainer.appendChild(tnWrapper);

            for (i = 0; i < data.items.length; i++) {
                thisTerm = document.createElement(itemTag);
                thisTerm.className = "tnItem";
                if(extGlobal.browserGap.isSafari) {
                    thisTerm.className = thisTerm.className + " tnItemSafari";
                }
                thisTerm.textContent = data.items[i].search_term;
                thisTerm.setAttribute("data-pos", i + 1);
                if (getTrendingNowUrl) {
                    thisTerm.href = getTrendingNowUrl(thisTerm.textContent);
                }

                tnWrapper.appendChild(thisTerm);
                tnItemsWidth.push(parseFloat(window.getComputedStyle(thisTerm).width || 0) + (i > 0 ? tnItemsWidth[i-1] : 0) + 36);// margin-left = 36px
                tnItems.push(thisTerm);
            }

            setTnItemsPadding(tnWrapper, tnLabelWidth, tnItems, tnItemsWidth);
            window.onresize = function (e) {
                setTnItemsPadding(tnWrapper, tnLabelWidth, tnItems, tnItemsWidth);
            };

            // delegate for tnItem clicking
            tnWrapper.addEventListener("click", function(e) {
                if(e.target && e.target.nodeName === "A") {
                    sendTnClickBeacon(e.target);
                }
            });

            if(extGlobal.browserGap.isSafari) {
                document.getElementsByClassName("tnLabel")[0].style.fontWeight = 'lighter';
            }
            //add Hide Trending Now option in menu
            if (localStorage.getItem("trendingBar") === "hidden") {
                trendingNowContainer.style.display = "none";
                addTrendingMenu(extGlobal.browserGap.getLocalizedString("newtab_extension_show_tn"));
            } else {
                addTrendingMenu(extGlobal.browserGap.getLocalizedString("newtab_extension_hide_tn"));
            }
        }
    }

    function addTrendingMenu(tnMenu) {
        var aTN = document.getElementById("toggleTN");
        aTN.textContent = tnMenu;
        aTN.onclick = toggleTN.bind(null);
        document.getElementById("tnDiv").style.display = "block";
        document.getElementById("tnDivider").style.display = "block";
    }

    function setTnItemsPadding (tnWrapper, tnLabelWidth, tnItems, tnItemsWidth) {
        if (!window.innerWidth || !tnWrapper || !tnLabelWidth || !Array.isArray(tnItems) || !Array.isArray(tnItemsWidth)) {
            return;
        }

        var winWidth = window.innerWidth || 0;
        var tnWrapperWidth = Math.max(winWidth - tnLabelWidth - (25 * 2) - 1, 0); // 1px offset
        var paddingLeft = 0;
        var tnNum = tnItems.length || 0;
        var lastIndex = 0;

        if (!tnWrapperWidth || !tnNum) {
            return;
        }

        tnWrapper.style.width = tnWrapperWidth + "px";
        tnItemsWidth.some(function (width, i) {
            // when the length of all tn items is small than the length of wrapper
            if (!paddingLeft && tnWrapperWidth < width) {
                paddingLeft = Math.floor((tnWrapperWidth - tnItemsWidth[i -1]) / i);
                lastIndex = i - 1;
                return true;
            }
            // when the total length of all tn items is small than the length of wrapper
            if (!paddingLeft && i === tnNum - 1 && tnWrapperWidth > width) {
                paddingLeft = Math.floor((tnWrapperWidth - width) / (i + 1));
                lastIndex = i;
                return true;
            }
            return false;
        });

        if (paddingLeft > 0) {
            tnItems.forEach(function (item, i) {
                if (i === lastIndex) {
                    item.style.paddingLeft = (tnWrapperWidth - (paddingLeft * lastIndex) - tnItemsWidth[lastIndex]) + "px";
                    item.style.display = "inline-block";
                } else if (i > lastIndex) {
                    item.style.display = "none";
                } else {
                    item.style.paddingLeft = paddingLeft + "px";
                    item.style.display = "inline-block";
                }
            });
        }
    }

    function sendTnClickBeacon (target) {
        var beaconConfig = {};
        var beaconParams = {};
        var url = target ? target.getAttribute("href") || "" : "";
        var regex = new RegExp("[?&]fr=([^&#]*)|&|#|$");
        var fr = "";

        if (!target || !url) {
            return;
        }

        fr = regex.exec(url);
        beaconParams.sec = "TrendingNow";
        beaconParams.slk = target.innerHTML || "";
        beaconParams.fr = fr[1] || "";
        beaconParams._p = target.getAttribute("data-pos") || 0;
        beaconParams.tar = target.getAttribute("href") || "";
        beaconConfig.params = beaconParams;
        extGlobal.browserGap.emitToMain({newTab: true, tracker: true, beaconConfig: beaconConfig});
    }

    function renderWeatherData(){

        var mapCodeToPosX = {
            "0": 4, "1": -28, "2": -28, "3": -61, "4": -93, "5": -125, "6": -157, "7": -189, "8": -221, "9": -253, "10": -157,
            "11": -285, "12": -285, "13": -317, "14": -317, "15": -349, "16": -349, "17": -381, "18": -221, "19": -830, "20": -445,
            "21": -445, "22": -445, "23": -413, "24": -413, "25": -990, "26": -509, "27": -541, "28": -541, "29": -573, "30": -605,
            "31": -637, "32": -477, "33": -670, "34": -702, "35": -381, "36": -477, "37": -61, "38": -734, "39": -766, "40": -798,
            "41": -894, "42": -349, "43": -894, "44": -509, "45": -61, "46": -349, "47": -61, "3200":   -862
        };
        var elementsF = document.getElementsByClassName("f");
        var elementsC = document.getElementsByClassName("c");
        var downImg = document.getElementsByClassName("w-down-arrow");
        var upImg = document.getElementsByClassName("w-up-arrow");
        //toggle from Fahrenheit to Celsius
        document.getElementById("unitBox").onclick = function() {
            for (var i = 0; i < elementsF.length; i++) {

                var displayStyle = window.getComputedStyle(elementsF[i], null).getPropertyValue("display");
                if(displayStyle === 'none' || displayStyle === ''){
                    elementsF[i].style.display = 'inline';
                    elementsC[i].style.display = 'none';
                }
                else{
                    elementsF[i].style.display = 'none';
                    elementsC[i].style.display = 'inline';
                }
            }
        };

        var degree = document.getElementById("degree");
        var desc = document.getElementById("desc");
        var high = document.getElementById("highDegree");
        var low = document.getElementById("lowDegree");
        var degreeC = document.getElementById("degreeC");
        var highC = document.getElementById("highDegreeC");
        var lowC = document.getElementById("lowDegreeC");
        var data = "";
        var code = "";

        if(newTabData.weatherData){
            data = JSON.parse(newTabData.weatherData);
            degree.textContent = data.degree;

            desc.textContent = extGlobal.browserGap.getLocalizedString(((data.desc).replace(" ", "_")).toLowerCase() + "_label");
            if(desc.textContent === "")
            {
                desc.textContent = data.desc;
            }
            high.textContent = data.highDegree;
            low.textContent = data.lowDegree;
            degreeC.textContent = data.degreeC;
            highC.textContent = data.highDegreeC;
            lowC.textContent = data.lowDegreeC;
            code = data.code;


            for (var i = 0; i < downImg.length; i++) {
                if(low.textContent !== "")
                {
                    downImg[i].style.backgroundImage = "url(icons/weatherIcons/downArrow.svg)";
                }
                if(high.textContent !== "")
                {
                    upImg[i].style.backgroundImage = "url(icons/weatherIcons/upArrow.svg)";
                }
            }

            if(code && code !== "")
            {
                document.getElementById("imgDesc").style.backgroundImage = "url(icons/weatherIcons/sprite-weathersmall.png)";
                var posX = mapCodeToPosX[code];
                document.getElementById("imgDesc").style.backgroundPosition = posX + "px 3px";
            }

            var displayStyle = window.getComputedStyle(document.getElementById("unitBox"), null).getPropertyValue("display");
            if(displayStyle === 'none' || displayStyle === ''){
                document.getElementById("unitBox").style.display = 'inline';
            }
        }
        else
        {
            document.getElementById("unitBox").style.display = 'none';
            var degreeSign = document.getElementsByClassName("deg");
            for (var j = 0; j < degreeSign.length; j++) {
                degreeSign[j].style.display = 'none';
            }

        }

    }

    function appendFlickrLogo(parent){
        var flickrLogo = document.createElement("img");
        flickrLogo.src = "icons/flickrLogo3.svg";
        flickrLogo.style.paddingBottom=4;
        parent.appendChild(flickrLogo);
    }

    function getTitle (site) {
        var title;
        if (site.isFavorite && site.title) { //as a favorite, always use the title field filled by user
            title = site.title;
        }
        else if (siteWhitelist[shortUrl(site.url)]) { //match on the domain+path, example yahoo.com/news
            title = siteWhitelist[shortUrl(site.url)].title;
        }
        else if (siteWhitelist[getFullDomainWithExtension(site.url)]) { //match on the domain only, example yahoo.com
            title = siteWhitelist[getFullDomainWithExtension(site.url)].title;
        } else {
            title = shortenString(site.title, extGlobal.constants.titleStringLength);
        }
        return title;
    }

    function isDoubleByte(str) {
        for (var i = 0, n = str.length; i < n; i++) {
            if (str.charCodeAt( i ) > 255) { return true; }
        }
        return false;
    }


    function generateSiteIcon(idx, site, icon, domain) {
        var customIconText = document.createElement("span");
        var filterTitle = site.title.replace(/[^\w\s ]/gi, '').replace(/  +/g, ' '); //keeps only letters and numbers and converts multiple spaces into unique space
        if (siteWhitelist[shortUrl(site.url)]) { //match on the domain+path, example yahoo.com/news
            customIconText.textContent = siteWhitelist[shortUrl(site.url)].shortTitle;
            icon.style.backgroundColor = siteWhitelist[shortUrl(site.url)].color;
        }
        else if (siteWhitelist[getFullDomainWithExtension(site.url)]) { //match on the domain only, example yahoo.com
            customIconText.textContent = siteWhitelist[getFullDomainWithExtension(site.url)].shortTitle;
            icon.style.backgroundColor = siteWhitelist[getFullDomainWithExtension(site.url)].color;
        } else {
            if (filterTitle.split(" ").length === 1 && filterTitle.split(" ")[0].length >= 2 && !isDoubleByte(site.title)) { //title is 1 word, >= 2 characters
                customIconText.textContent = site.title.split(" ")[0].substring(0, 1).toUpperCase() + filterTitle.split(" ")[0].substring(1, 2).toLowerCase();
            } else if (filterTitle.split(" ").length > 1 && filterTitle.split(" ")[0].length >= 1 && filterTitle.split(" ")[1].length >= 1 && !isDoubleByte(site.title)) {
                customIconText.textContent = filterTitle.split(" ")[0].substring(0, 1).toUpperCase() + filterTitle.split(" ")[1].substring(0, 1).toUpperCase();
            } else { //default is the first character of the title only
                customIconText.textContent = site.title.substring(0, 1).toUpperCase();
            }
            icon.style.backgroundColor = colorList[idx];
        }
        icon.setAttribute("class", "topSiteIcon customIcon");
        icon.appendChild(customIconText);
    }

    function getIcon(idx, site, icon, domain) {
        var customIcon,
            domainUrl = getSubDomain(site.url)+domain,
            pathDomainUrl = getPathSubDomain(site.url)+domain;

        icon.setAttribute("class", "topSiteIcon bc-background-"+domain);
        icon.setAttribute("id", "topSiteIcon_"+(idx+1).toString());

        // ** get default icon from whitelist ** //
        if ((typeof(topIcons[pathDomainUrl]) !== "undefined") && (pathDomainUrl !== domain)) {
            icon.style.backgroundImage = "url(icons/"+topIcons[pathDomainUrl]+".svg)";
        }
        else if(typeof(topIcons[domainUrl]) !== "undefined" ) {
            icon.style.backgroundImage = "url(icons/"+topIcons[domainUrl]+".svg)";
        }
        // we should not have the following, otherwise all sub-domain things will have the domain icon
        /*else if (typeof(topIcons[domain]) !== "undefined") {
            icon.style.backgroundImage = "url(icons/"+topIcons[domain]+".svg)";
        }*/
        // ** else generate icon ** //
        else
         if (site.title) {
            generateSiteIcon(idx, site, icon, domain);
        } else {
            icon.style.backgroundImage = "url(icons/website.svg)";
        }
    }

    function getPartnerInPosition(partners, position) {
        var posPartners = [],
            i;
        for (i = 0; i<partners.length; i++) {
            if (partners[i].position && partners[i].position === position) {
                posPartners.push(partners[i]);
            }
        }
        return posPartners;
    }

    function renderNewTopSites(parent, newFav) {
        var sitesPerRow = getSitesPerRow();
        var max = sitesPerRow;
        var topSiteList = newTabData.topSites;
        var topSites = [];
        var allSites = [];
        var editButton = document.getElementById("editButton");
        var favoriteSites = getFavoriteSites();
        var lastVisibleElement;
        var leftPartners = getPartnerInPosition(partners, "left");
        var rightPartners = getPartnerInPosition(partners, "right");

        editButton.onclick = toggleEditMode.bind(null);
        populateUrlArrays();

        allSites = pruneSites(leftPartners.concat(rightPartners).concat(favoriteSites).concat(topSiteList).concat(defaultSites));
        var siteDivs = [];
        for(var i = 0; i<allSites.length && i < maxSites; i++){
            var siteDiv = document.createElement("div"),
                siteText = document.createElement("div"),
                siteTextTitle = document.createElement("div"),
                siteTextUrl = document.createElement("div"),
                manageSite = document.createElement("div"),
                removeSiteDiv = document.createElement("div"),
                pinSite = document.createElement("div"),
                icon = document.createElement("div");

            var siteDivId = "topsiteDiv_" + (i + 1).toString();
            siteDiv.setAttribute("id", siteDivId);
            var siteTitle = getTitle(allSites[i]);
            siteDiv.onclick = navToSite.bind(null, allSites[i].url, siteDivId, siteTitle);
            var siteTextId = "siteTextId_" + (i + 1).toString();
            siteText.setAttribute("id",siteTextId);

            siteTextTitle.innerHTML = siteTitle;
            siteTextTitle.setAttribute("class", "siteTextTitle");
            siteTextUrl.innerHTML = shortenString(shortUrl(allSites[i].url), extGlobal.constants.shortenStringLength);
            siteTextUrl.setAttribute("class", "siteTextUrl");
            siteText.appendChild(siteTextTitle);
            siteText.appendChild(siteTextUrl);

            manageSite.setAttribute("class","manageSite");
            pinSite.setAttribute("class","pinSite");
            removeSiteDiv.setAttribute("class","removeSite");
            removeSiteDiv.setAttribute("id","removeSite_"+(i+1).toString());
            siteText.setAttribute("class","siteTextContainer");
            if (newFav && favoriteSites && allSites[i] === favoriteSites[0]) {
                siteDiv.setAttribute("class","topSite newFav"); //for newly added favorite we'll have newFav css animation
            } else {
                siteDiv.setAttribute("class","topSite");
            }

            var domain = getDomain(allSites[i].url);

            getIcon(i, allSites[i], icon, domain);


            var siteURL = allSites[i].url;

            siteDiv.onmouseover = showUrl.bind(null, siteURL, i);
            siteDiv.onmouseout = hideUrl.bind(null, i);

            removeSiteDiv.style.backgroundImage = "url(icons/close_x.svg)";
            removeSiteDiv.onclick = removeSite.bind(null,siteURL);

            manageSite.appendChild(removeSiteDiv);
            manageSite.appendChild(pinSite);
            //Add back when we start adding and removing top sites
            siteDiv.appendChild(icon);
            siteDiv.appendChild(removeSiteDiv); //removeSiteDiv won't be a child of icon, so it won't have the moving effect
            siteDiv.appendChild(siteText);

            siteDivs.push(siteDiv);
        }
        viewUtils.clearInnerHTML(parent);

        var row = siteDivs;
        var topSitesDiv = document.getElementById("topSites");
        for(var rowItem = 0; rowItem<row.length; rowItem++){
            topSitesDiv.appendChild(row[rowItem]);
        }
        if(isEditModeOn){
            renderEditMode();
        }

        lastVisibleElement = viewUtils.resizeTopSites() + 1; //as in the DOM they start from 1
        handleRightPartners(lastVisibleElement); //take care of the right partner (beFrugal case)

    }

    function handleRightPartners(lastIndex) {
        var lastVisibleDiv = document.getElementById("topsiteDiv_" + lastIndex);
        var topSitesDiv = document.getElementById("topSites");
        var rightPartners = getPartnerInPosition(partners, "right");
        var rightPartnersIdx = [];
        if (rightPartners && rightPartners.length > 0) {
            for (var i = 0; i < topSitesDiv.childNodes.length; i ++) {
                if (isRightPartner(topSitesDiv.childNodes[i], rightPartners)) {
                    rightPartnersIdx.push(topSitesDiv.childNodes[i].getAttribute("id"));
                }
            }
            for (i = rightPartnersIdx.length-1; i >= 0; i--) { //we're going to put all the right partners at the last index of the topsite div, keeping the same order as in partner array
                topSitesDiv.insertBefore(document.getElementById(rightPartnersIdx[i]), lastVisibleDiv.nextSibling);
            }
        }
    }

    function isRightPartner(node, rightPartners) {
        var urlText = node.querySelector(".siteTextContainer .siteTextUrl"),
            titleText = node.querySelector(".siteTextContainer .siteTextTitle");
        for (var i = 0; i < rightPartners.length; i++) {
            if (shortenString(shortUrl(rightPartners[i].url), extGlobal.constants.shortenStringLength) === urlText.textContent && getTitle(rightPartners[i]) === titleText.textContent) {
                return true;
            }
        }
        return false;
    }

    // removes blacklisted sites and duplicates. input array is the concat of partners + topSites + defaultSites
    function pruneSites(allSites) {
        var prunedSites = [],
            blackListed,
            duplicate,
            mapUrls = {},
            blackListUrl = {},
            i,
            j;

        for (j = 0; j < sitesBlackList.length; j++) { //putting all blackList sites in a map
            blackListUrl[shortUrl(sitesBlackList[j])] = true;
        }
        for (i = 0; i < allSites.length; i++) {
            blackListed = false;
            duplicate = false;
            if (blackListUrl[shortUrl(allSites[i].url)]) {
                blackListed = true;
            }

            if (mapUrls[shortUrl(allSites[i].url)]) {
                duplicate = true;
            }
            mapUrls[shortUrl(allSites[i].url)] = true; //storing the url as key to identify duplicates

            if (!blackListed && !duplicate) {
                prunedSites.push(allSites[i]);
            }
        }
        return prunedSites;
    }

    function removeSite(siteUrl)
    {
        sitesBlackList.push(siteUrl);
        localStorage.setItem("sitesBlackList",JSON.stringify(sitesBlackList));

        try { // removing site from favorite sites if presents
            var favoriteSites = getFavoriteSites();
            for (var i=0;i<favoriteSites.length;i++) {
                if (favoriteSites[i].url === siteUrl) {
                    favoriteSites.splice(i, 1);
                    break;
                }
            }
            localStorage.setItem("favoriteSites", JSON.stringify(favoriteSites));
        } catch (e) {
            console.error(e);
        }

        if(!unittest){
            renderNewTopSites(document.querySelector(".newTopSitesContainer"));
        }
    }


    //Control how many site links are displayed in the new tab based on window size
    function getSitesPerRow(){
        return extGlobal.constants.iconsPerRow;
    }

    //www.yahoo.com -> yahoo, oracle.com/java -> oracle
    function getDomain(url){
        //assume they start with http and it's a real url
        if (url.indexOf("https://") === 0) {
            url = url.slice(8);
        } else if (url.indexOf("http://") === 0) {
            url = url.slice(7);
        }
        var endOfDomain = url.indexOf("/");
        if (endOfDomain > -1) {
            url = url.slice(0, endOfDomain);
        }
        url = url.split(".");
        return url[url.length-2];
    }

    //www.yahoo.com -> yahoo.com, oracle.com/java -> oracle.com, yahoo.co.jp/something -> yahoo.co.jp
    function getFullDomainWithExtension(url) {
        //assume they start with http and it's a real url
        if (url.indexOf("https://") === 0) {
            url = url.slice(8);
        } else if (url.indexOf("http://") === 0) {
            url = url.slice(7);
        }
        if (url.indexOf("www.") === 0) {
            url = url.slice(4);
        }
        var endOfDomain = url.indexOf("/");
        if (endOfDomain > -1) {
            url = url.slice(0,endOfDomain);
        }
        return url.split("?")[0];
    }

    //xyz.yahoo.com -> xyz, oracle.com -> ""
    function getSubDomain(url){
        url = url.indexOf("https://") === 0 ? url.slice(8) : (url.indexOf("http://") === 0 ? url.slice(7) : url);
        var endOfDomain = url.indexOf("/");
        url = url.slice(0,endOfDomain).split(".");
        if(url.length > 2)
        {
            var subDomain = url[url.length-3];
            if((subDomainBlackList.indexOf(subDomain) > -1))
            {
                return "";
            }
            else
            {
                return subDomain;
            }
        }
        else
        {
            return "";
        }
    }

    //http://www.yahoo.com/xyz/ -> xyz
    //todo: function acts wierd if no subdomain present
    function getPathSubDomain(url){
        url = url.indexOf("https://") === 0 ? url.slice(8) : url.slice(7);
        var startOfSubDomain = url.indexOf("/");
        var endOfSubDomain = url.indexOf("/",startOfSubDomain+1);
        if(endOfSubDomain === -1)
        {
            if(url.indexOf("?",startOfSubDomain+1) !== -1)
            {
                endOfSubDomain = url.indexOf("?",startOfSubDomain+1);
            }
            else
            {
                endOfSubDomain = url.length;
            }
        }
        var subDomain = url.slice(startOfSubDomain+1,endOfSubDomain);
        return subDomain;
    }

    //Render the blur image in the middle of the tab
    function renderBlur(){
        //var uiBlur = document.getElementById("uiBlur");
        var uiBlur = document.getElementById("searchSuggestContainerNew");
        uiBlur.setAttribute("class", "bgImage");
        resizeBlur();
    }

    function resizeBlur(){
        viewUtils.clipToElement("#searchSuggestContainerNew", document.querySelector("#uiContainer"));
    }

    //Search Protect Prompt asks user if they want to change default search engine to Yahoo!
    function renderSearchProtectPrompt()
    {
        if (document.getElementById("searchProtectDiv")){
            return;
        }
        var mainContainer = document.getElementById("mainContainer");

        var searchProtectDiv = document.createElement("div");
        searchProtectDiv.setAttribute("id", "searchProtectDiv");
        searchProtectDiv.setAttribute("name", "searchProtectDiv");
        searchProtectDiv.setAttribute("class", "searchProtectDiv uiBG");

        var yahooImgBgDiv = document.createElement("div");
        yahooImgBgDiv.setAttribute("id", "yahooImgBgDiv");
        yahooImgBgDiv.setAttribute("name", "yahooImgBgDiv");
        yahooImgBgDiv.setAttribute("class", "yahooSearchProtectIconBg");

        var yahooImgSvgDiv = document.createElement("div");
        yahooImgSvgDiv.setAttribute("id", "yahooImgSvgDiv");
        yahooImgSvgDiv.setAttribute("name", "yahooImgSvgDiv");
        yahooImgSvgDiv.setAttribute("class", "yahooSearchProtectIconSvg");
        yahooImgSvgDiv.style.backgroundImage = "url(icons/yahoologo.svg)";

        var textDiv = document.createElement("div");
        textDiv.setAttribute("id", "prompt");
        textDiv.setAttribute("name", "prompt");
        textDiv.setAttribute("class", "searchProtectPrompt");
        textDiv.textContent = extGlobal.browserGap.getLocalizedString("newtab_firefox_extension_search_protect_prompt_part1");

        var acceptDiv = document.createElement("div");
        acceptDiv.setAttribute("id", extGlobal.constants.search_protect_accept);
        acceptDiv.setAttribute("name", extGlobal.constants.search_protect_accept);
        acceptDiv.setAttribute("class", "searchProtectAcceptDiv");
        acceptDiv.textContent = extGlobal.browserGap.getLocalizedString("newtab_firefox_extension_search_protect_accept");
        acceptDiv.onclick = function(){
            newTabData.promptSearchProtect = false;
            hideSearchProtectPrompt();
            extGlobal.browserGap.emitToMain({searchProtect: true, setSearch: true});
        };

        var declineButton = document.createElement("input");
        declineButton.setAttribute("id", extGlobal.constants.search_protect_decline);
        declineButton.setAttribute("name", extGlobal.constants.search_protect_decline);
        declineButton.setAttribute("class", "searchProtectDeclineImg");
        declineButton.setAttribute("type", "image");
        declineButton.src = "icons/cross.svg";
        declineButton.onclick = function(){
            newTabData.promptSearchProtect = false;
            hideSearchProtectPrompt();
            extGlobal.browserGap.emitToMain({searchProtect: true, setSearch: false});
        };

        yahooImgBgDiv.appendChild(yahooImgSvgDiv);

        searchProtectDiv.appendChild(yahooImgBgDiv);
        searchProtectDiv.appendChild(textDiv);
        searchProtectDiv.appendChild(acceptDiv);
        searchProtectDiv.appendChild(declineButton);
        mainContainer.appendChild(searchProtectDiv);

    }

    function hideSearchProtectPrompt() {
        var searchProtectDiv = document.getElementById("searchProtectDiv");
        if(searchProtectDiv) {
            var mainContainer = document.getElementById("mainContainer");
            mainContainer.removeChild(searchProtectDiv);
        }
    }
    //show url in the url display block
    function showUrl(siteURL, index)
    {

        index++;
        var siteTextBlock = document.getElementById("siteTextId_" + index);
        var iconNode = document.getElementById("topSiteIcon_" + index);
        if (siteTextBlock.style.display !== "block") {
            siteTextBlock.style.visibility = "hidden";
            siteTextBlock.style.display = "block";
            var siteTextBlockHalf = siteTextBlock.offsetLeft + (siteTextBlock.offsetWidth / 2);
            var iconHalf = iconNode.offsetLeft + (iconNode.offsetWidth / 2);
            var moveToLeft = siteTextBlockHalf - iconHalf;

            if (Math.abs(siteTextBlockHalf - iconHalf) > 2) {
                siteTextBlock.style.left = siteTextBlock.offsetLeft - moveToLeft;
            }
            siteTextBlock.style.visibility = "visible";
        }
    }

    function shortUrl(siteURL) {
        if (siteURL.startsWith("http://")) {
            siteURL = siteURL.replace("http://", "");
        } else if (siteURL.startsWith("https://")) {
            siteURL = siteURL.replace("https://", "");
        }
        if (siteURL.startsWith("www.")) {
            siteURL = siteURL.replace("www.", "");
        }
        if (siteURL.endsWith("/")) {
            siteURL = siteURL.slice(0, siteURL.length-1);
        }
        return siteURL;
    }

    //hide url display block
    function hideUrl(index)
    {
        index++;
        var siteTextBlock = document.getElementById("siteTextId_" + index);
        siteTextBlock.style.display = "none";
    }

    function calculateIconDistance(){
        var showLength = document.createElement("div");
        showLength.setAttribute("id","showLength");
        showLength.style.position = "absolute";

        if(extGlobal.browserGap.isChrome)
        {
            showLength.style.fontFamily = "lato";
        }
        else
        {
            showLength.style.fontFamily = "Helvetica Neue";
        }

        showLength.style.fontSize = "14px";
        showLength.textContent = extGlobal.browserGap.getLocalizedString("newtab_extension_show_image");
        document.body.appendChild(showLength);
        var sLength = showLength.clientWidth;
        showLength.style.display = "none";

        var hideLength = document.createElement("div");
        hideLength.style.position = "absolute";
        hideLength.setAttribute("id","hideLength");

        if(extGlobal.browserGap.isChrome) {
            hideLength.style.fontFamily = "lato";
        } else{
            hideLength.style.fontFamily = "Helvetica Neue";
        }

        hideLength.style.fontSize = "14px";
        hideLength.textContent = extGlobal.browserGap.getLocalizedString("newtab_extension_show_topsites");
        document.body.appendChild(hideLength);
        var hLength = hideLength.clientWidth;
        hideLength.style.display = "none";

        return Math.max(hLength,sLength);
    }

    //Render the toggle (show/hide topsites) button
    function renderToggleView()
    {
        var toggleViewText = document.getElementById("toggleViewText");
        toggleViewText.onclick = switchView.bind(null);

        var iconDistance = extGlobal.constants.iconToggleDistance + extGlobal.constants.rightToggleViewDistance + calculateIconDistance();

        if(!showFullImage)
        {
            toggleViewText.textContent = extGlobal.browserGap.getLocalizedString("newtab_extension_show_image");
        }
        else
        {
            toggleViewText.textContent = extGlobal.browserGap.getLocalizedString("newtab_extension_show_topsites");
        }
    }

    function showAddSign(showBool) {
        var addSign = document.getElementById("addIcon");
        if (showBool) {
            addSign.style.visibility = "visible";
            addSign.classList.add("appear");
        } else {
            addSign.style.visibility = "hidden";
            addSign.classList.remove("appear");
        }
    }

    function initFavorites() {
        var inputFavoriteUrl = document.getElementById("favoriteUrl"),
            inputFavoriteTitle = document.getElementById("favoriteTitle");

        function handleFavUrlKey(e) { // url input listener
            showAddSign(inputFavoriteUrl.value !== "" && inputFavoriteTitle.value !== "");
            if (e.keyCode === 13 && inputFavoriteUrl.value !== "") {
                inputFavoriteTitle.focus();
            } else {
                inputFavoriteUrl.placeholder = extGlobal.browserGap.getLocalizedString("newtab_extension_enter_url");
            }
        }


        // ***** title input handling ****** //
        document.getElementById("addIcon").onclick = function() {
            if (inputFavoriteUrl.value !== "" && inputFavoriteTitle.value !== "") {
                addSiteToFavorite(inputFavoriteUrl.value, inputFavoriteTitle.value); //if all is ok we add the URL
            } else {
                if (inputFavoriteUrl.value === "") {
                    inputFavoriteUrl.placeholder = extGlobal.browserGap.getLocalizedString("newtab_extension_enter_url");
                    inputFavoriteUrl.focus();
                }
                if (inputFavoriteTitle.value === "") {
                    inputFavoriteTitle.placeholder = extGlobal.browserGap.getLocalizedString("newtab_extension_enter_title");
                    inputFavoriteTitle.focus();
                }
            }
        };
        function handleFavTitleKey(e) { // title input listener

            showAddSign(inputFavoriteUrl.value !== "" && inputFavoriteTitle.value !== "");
            if (e.keyCode === 13 && inputFavoriteUrl.value !== "" && inputFavoriteTitle.value !== "") {
                addSiteToFavorite(inputFavoriteUrl.value, inputFavoriteTitle.value); //if all is ok we add the URL
            } else if (e.keyCode === 13) {
                if (inputFavoriteUrl.value === "") {
                    inputFavoriteUrl.placeholder = extGlobal.browserGap.getLocalizedString("newtab_extension_enter_url");
                }
                if (inputFavoriteTitle.value === "") {
                    inputFavoriteTitle.placeholder = extGlobal.browserGap.getLocalizedString("newtab_extension_enter_title");
                }
            }
        }
        // *********************************** //

        inputFavoriteUrl.addEventListener("keyup", handleFavUrlKey);
        inputFavoriteTitle.addEventListener("keyup", handleFavTitleKey);
    }

    function addSiteToFavorite(siteUrl, siteTitle) {
        try {
            var favoriteSites = getFavoriteSites(),
                i;
            for (i=0;i<favoriteSites.length;i++) { //if favorite already exists, we will splice it and add it again on top of the list
                if (shortUrl(favoriteSites[i].url) === shortUrl(siteUrl)) {
                    favoriteSites.splice(i, 1);
                    break;
                }
            }
            var newFav = [{"url": siteUrl, "title": siteTitle, "isFavorite": true}];

            favoriteSites.unshift(newFav[0]);
            localStorage.setItem("favoriteSites", JSON.stringify(favoriteSites));
            removeFromBlacklist(siteUrl); // If user adds a favorite that was in the blacklist, we need to remove that site from blacklist
            renderNewTopSites(document.querySelector(".newTopSitesContainer"), true);

            document.getElementById("favoriteUrl").value = ""; //after adding favorite remove input text
            document.getElementById("favoriteTitle").value = ""; //after adding favorite remove input text
            showAddSign(false);
        } catch (e) {
            console.error(e);
        }
    }

    function removeFromBlacklist(siteUrl) { //removes site from blackList if it exists.
        for(var i=0;i<sitesBlackList.length;i++) {
            if (shortUrl(sitesBlackList[i]) === shortUrl(siteUrl)) {
                sitesBlackList.splice(i, 1);
                break;
            }
        }
        localStorage.setItem("sitesBlackList", JSON.stringify(sitesBlackList));
    }

    function getFavoriteSites() {
        try {
            var favoriteSites = JSON.parse(localStorage.getItem("favoriteSites"));
            if (!Array.isArray(favoriteSites)) {
                favoriteSites = [];
            }
            return favoriteSites;
        } catch (e) {
            console.error(e);
            return [];
        }
    }

    function renderEditView()
    {
        if(extGlobal.browserGap.isSafari) //should only have 'Hide Trending Now' and 'Feedback' buttons
        {
            document.getElementsByClassName('divider')[0].style.display = 'none';
            document.getElementsByClassName('divider')[1].style.display = 'none';
            document.getElementById('editButton').parentNode.style.display = 'none';
            document.getElementById('toggleViewText').parentNode.style.display = 'none';
        }
        else
        {
            //var editViewIcon = document.getElementById("editIcon");
            var editViewButton = document.getElementById("editButton");
            //editViewIcon.style.display = "block";
            editViewButton.style.display = "flex";
            editViewButton.textContent = extGlobal.browserGap.getLocalizedString("newtab_extension_edit_settings_label");
        }
        
    }
    //Handle the click of toggle button - hides the Search bar + auto suggest
    function switchView()
    {
        var toggleViewText = document.getElementById("toggleViewText");
        var searchBox = document.getElementById("searchBoxNew");
        //var panelIcon = document.getElementById("panelIcon");
        if(showFullImage)
        {
            toggleViewText.textContent = extGlobal.browserGap.getLocalizedString("newtab_extension_show_image");
            document.getElementById("uiContainer").style.visibility = "visible";
            if (searchBox.value !== "") { //we only put blur back when there is an autosuggest (when there is a query)
                document.getElementById("uiBlur").style.visibility = "visible";
            }
            localStorage.setItem("searchBar", "visible");
            showFullImage = false;
        }
        else
        {
            toggleViewText.textContent = extGlobal.browserGap.getLocalizedString("newtab_extension_show_topsites");
            document.getElementById("uiContainer").style.visibility = "hidden";
            document.getElementById("uiBlur").style.visibility = "hidden";
            showFullImage = true;
            localStorage.setItem("searchBar", "hidden");
        }
    }

    function renderSearchBar() {
        if ((localStorage.getItem("searchBar") || "visible") === "hidden") {
            switchView(); //initial switchView will set different items to "hidden" and change the toggle view text
        } else {
            document.getElementById("uiContainer").style.visibility = "visible"; //by default the search bar is hidden in html file, to avoid showing it for a few ms. We make it visible as soon as javascript is run here
        }
    }

    function toggleEditMode()
    {
        var beaconConfig = {};
        var beaconParams = {};
        var sitesLength = (document.querySelectorAll("#topSites div.topSite") || []).length;
        if(editModeToggle)
        {
            isEditModeOn = true;
            document.getElementById("bg").style.cursor = "pointer";
            if (sitesLength === 0) { // when sites are all empty and user clicks on "Edit Favorites" we'll delete the blacklist to bring back all sites
                localStorage.removeItem("sitesBlackList");
                sitesBlackList = [];
                renderNewTopSites(document.querySelector(".newTopSitesContainer"));
            }
            renderEditMode();

            document.getElementById("editButton").textContent = extGlobal.browserGap.getLocalizedString("newtab_extension_done_settings_label");
            editModeToggle = false;
            beaconParams.sec = "TopSitesEditButton";
            beaconParams.slk = extGlobal.browserGap.getLocalizedString("newtab_extension_edit_settings_label");
            beaconParams.gpos = extGlobal.constants.tracker_gpos_topsites;
            beaconParams._p = extGlobal.constants.tracker_topSitesArea_p_edit;
            beaconConfig.params = beaconParams;
            extGlobal.browserGap.emitToMain({newTab: true, tracker: true, beaconConfig: beaconConfig});
        }
        else
        {
            isEditModeOn = false;
            document.getElementById("bg").style.cursor = "default";
            for(var i = 1; i <= sitesLength; i++)
            {
                var siteBlock = document.getElementById("topSiteIcon_"+i);
                var removeIcon = document.getElementById('removeSite_'+i);
                removeIcon.style.display = "none";
                siteBlock.classList.remove("animated","wiggle", "wiggle_delay_"+i);
            }
            document.getElementById("editButton").textContent = extGlobal.browserGap.getLocalizedString("newtab_extension_edit_settings_label");
            viewUtils.hideElement(document.getElementById("addFavoriteUrl"));
            viewUtils.hideElement(document.getElementById("addFavoriteTitle"));

            editModeToggle = true;
            beaconParams.sec = "TopSitesDoneButton";
            beaconParams.slk = extGlobal.browserGap.getLocalizedString("newtab_extension_done_settings_label");
            beaconParams.gpos = extGlobal.constants.tracker_gpos_topsites;
            beaconParams._p = extGlobal.constants.tracker_topSitesArea_p_done;
            beaconConfig.params = beaconParams;
            extGlobal.browserGap.emitToMain({newTab: true, tracker: true, beaconConfig: beaconConfig});
        }
    }

    function renderEditMode()
    {
        var topSitesLength = (document.querySelectorAll("#topSites div.topSite") || []).length,
            siteTextId,
            siteBlock,
            removeIcon;
        for(var i = 1; i <= topSitesLength; i++)
        {
            siteTextId = document.getElementById("siteTextId_"+i);
            siteBlock = document.getElementById("topSiteIcon_"+i);
            removeIcon = document.getElementById('removeSite_'+i);
            removeIcon.style.display = "block";
            siteBlock.classList.add("animated","wiggle");
            //removeIcon.classList.add("animated", "animateCross"); //uncomment to make the arrow move
        }
        document.getElementById("favoriteUrl").placeholder = extGlobal.browserGap.getLocalizedString("newtab_extension_add_url");
        document.getElementById("favoriteTitle").placeholder = extGlobal.browserGap.getLocalizedString("newtab_extension_add_title");
        viewUtils.unhideElement(document.getElementById("addFavoriteUrl"));
        viewUtils.unhideElement(document.getElementById("addFavoriteTitle"));
        document.getElementById("favoriteUrl").focus(); //focus on input text to add favorite

    }


    //populate partnerUrls
    function populateUrlArrays()
    {
        for(var j=0; j<partners.length; j++)
        {
            partnerUrls[j] = partners[j].url;
        }

        for(var l=0; l<defaultSites.length; l++)
        {
            defaultUrls.push(defaultSites[l].url);
            defaultSitesText.push(defaultSites[l].title);
        }
    }

    function ffRender(){
        //hover url box shadow
        css.addSelector(".urlShow",{"box-shadow": "inset 0 -55px 50px -25px rgba(0,0,0,0.8)"});

        //Search Protect rendering
        if(newTabData.promptSearchProtect){
            renderSearchProtectPrompt();
        }
    }

    function renderFeedBack() {
        var feedBack = document.getElementById("feedBack");
        var feedbackLink = extGlobal.browserGap.getLocalizedString("newtab_extension_feedback_link");

        if (feedbackLink) {
            feedBack.style.display = "flex";
            feedBack.textContent = extGlobal.browserGap.getLocalizedString("newtab_extension_feedback_link_label");
            feedBack.onclick = sendFeedback.bind(null, "feedBack", feedbackLink);
        } else {
            feedBack.style.display = "none";
        }
    }

    function sendFeedback(id,link)
    {
        var beaconConfig = {};
        var beaconParams = {};
        var feedBack = document.getElementById(id);
        beaconParams.sec = id;
        beaconParams.slk = feedBack.textContent;
        beaconParams.tar = link;
        beaconParams.gpos = extGlobal.constants.tracker_gpos_feedback;
        beaconParams._p = extGlobal.constants.tracker_feedbackArea_p_feedback;
        beaconConfig.params = beaconParams;
        extGlobal.browserGap.emitToMain({newTab: true, tracker: true, beaconConfig: beaconConfig});
        redirectTo(link);
    }

    function sendPageViewBeacon(spaceId)
    {
        var beaconConfig = {};
        var beaconParams = {};
        beaconParams.pt = "newtab_page";
        viewUtils.setTnViewParams(newTabData, beaconParams);
        viewUtils.setPartnerSiteFlag(newTabData, beaconParams, partners, sitesBlackList);
        beaconConfig.params = beaconParams;
        extGlobal.browserGap.emitToMain({ pageInfo:true, newTab: true, tracker: true, beaconConfig: beaconConfig});
    }

    //render everything
    function render(){
        if(extGlobal.browserGap.isChrome)
        {
            sendPageViewBeacon(extGlobal.constants.distributionChannels[extGlobal.distributionChannel].chrome_space_id || extGlobal.constants.chrome_space_id);
        }
        else if(extGlobal.browserGap.isFirefox)
        {
            sendPageViewBeacon(extGlobal.constants.distributionChannels[extGlobal.distributionChannel].firefox_space_id || extGlobal.constants.firefox_space_id);
        }
        else if(extGlobal.browserGap.isSafari)
        {
            sendPageViewBeacon(extGlobal.constants.distributionChannels[extGlobal.distributionChannel].safari_space_id || extGlobal.constants.safari_space_id);
        }

        renderBackground();
        renderOwnerData();

        if(extGlobal.browserGap.isSafari !== true) {
            renderNewTopSites(document.querySelector(".newTopSitesContainer"));
        }
        renderToggleView();
        renderSearchBar();
        renderTrendingNow();
        renderFeedBack();
        renderEditView();

        if(extGlobal.browserGap.isChrome){
            // renderBookmarks(document.getElementById("bookmarksFlex"));
            /* if(bookmarksState)
             showBookmarks();
             else
             hideBookmarks(); */
        } else {
            ffRender();
        }

        // handling resizing for blur effect on autosuggest box
        if (window.addEventListener) {
            window.addEventListener('resize', function() {
                var lastVisibleElement = viewUtils.resizeTopSites() + 1; //as in the DOM they start from 1
                handleRightPartners(lastVisibleElement);
            });
            //remove edit mode when clicking anywhere in window
            window.addEventListener('click', function(e) {
                if (isEditModeOn &&
                    (e.target.className || "").indexOf("removeSite") === -1 &&
                    (e.target.id || "") !== "editButton" &&
                    (e.target.id || "") !== "favoriteUrl" &&
                    (e.target.id || "") !== "favoriteTitle" &&
                    (e.target.className || "").indexOf("addSign") === -1) {
                    toggleEditMode();
                }
            });
        }

        initFavorites();

        if (newTabData.searchSet && newTabData.searchSet.shouldPrompt && newTabData.searchSet.currentEngine && newTabData.searchSet.yahooPartner) {
            var interstitial = document.createElement("div");
            var searchSetText = document.createElement("div");
            var options = document.createElement("div");
            searchSetText.innerHTML = "<div id='closeIcon'></div><div class='promptUserDiv'>Do you want to change your search engine to Yahoo?</div><div class='yahoologo'>&nbsp;</div>";
            options.innerHTML = "<div class='choiceBody'><form><input class='choice' id='yahoo' type='radio' name='searchset'>&nbsp;Yahoo<br/>" +
                                "<input class='choice' id='other' type='radio' name='searchset' value='other'>&nbsp;Keep current search engine<br/>" +
                                "<span class='userConfirm'><input type='button' id='searchSetPromptOK' value='OK'>&nbsp;&nbsp;" +
                                "<input type='button' id='searchSetPromptCancel' value='Cancel'></span></form></div>";
            options.querySelector("#yahoo").setAttribute("value", newTabData.searchSet.yahooPartner);

            interstitial.appendChild(searchSetText);
            interstitial.appendChild(options);
            interstitial.className = "interstitial";
            interstitial.setAttribute("id", "interstitial");

            document.body.appendChild(interstitial);

            document.getElementById('searchSetPromptOK').onclick = function() {
                if (document.getElementById("yahoo").checked || document.getElementById("other").checked) {
                    extGlobal.browserGap.emitToMain({userSearchSet: "OK", yahooSelected: document.getElementById("yahoo").checked});
                    document.getElementById("interstitial").style.display = "none";
                }
            };
            document.getElementById('searchSetPromptCancel').onclick = function() {
                extGlobal.browserGap.emitToMain({userSearchSet: "Cancel"});
                document.getElementById("interstitial").style.display = "none";
            };
            document.getElementById('closeIcon').onclick = function() {
                extGlobal.browserGap.emitToMain({userSearchSet: "Close"});
                document.getElementById("interstitial").style.display = "none";
            };

        }
        //put focus on the search bar (will only work for tabs opened using tabs.open)
        document.getElementById("searchBoxNew").focus();
    }

    this.css = css;
    this.render = render;
    /* jshint ignore: start */
    if (unittest) {
        this.showFullImage = showFullImage;
        this.partners = partners;
        //this.partnersLastSlots = partnersLastSlots;
        this.partnerUrls = partnerUrls;
        this.offlinePhotos = offlinePhotos;
        this.defaultSites = defaultSites;
        this.sitesBlackList = sitesBlackList;

        this.navToSite = navToSite;
        this.redirectTo = redirectTo;
        this.shortenString = shortenString;
        this.renderBackground =  renderBackground;
        this.populateMissingData = populateMissingData;
        this.renderOwnerData = renderOwnerData;
        this.renderTrendingNow = renderTrendingNow;
        this.renderWeatherData = renderWeatherData;
        this.renderTopSites = renderTopSites;
        this.getSitesPerRow = getSitesPerRow;
        this.getDomain = getDomain;
        this.getSubDomain = getSubDomain;
        this.getPathSubDomain = getPathSubDomain;
        this.renderBlur = renderBlur;
        this.resizeBlur = resizeBlur;
        this.renderSearchProtectPrompt = renderSearchProtectPrompt;
        this.showUrl = showUrl;
        this.hideUrl = hideUrl;
        this.renderToggleView = renderToggleView;
        this.initFavorites = initFavorites;
        this.getFavoriteSites = getFavoriteSites;
        this.switchView = switchView;
        this.populateUrlArrays = populateUrlArrays;
        this.removeSite = removeSite;
        this.toggleEditMode = toggleEditMode;
        this.renderEditMode = renderEditMode;
        this.renderFeedBack = renderFeedBack;
        this.calculateIconDistance = calculateIconDistance;
        //workaround due to scope issues
        this.injectFunction = function (){
            redirectTo = this.redirectTo;
            showFullImage = this.showFullImage;
            resizeBlur = this.resizeBlur;
        }
        this.syncData = function (){
            this.partnerUrls = partnerUrls;
        }
    }
    /* jshint ignore: end */
    return this;
}
function ViewUtils() { // jshint ignore: line
    // the css generator needs to be unique so different future uses of viewutils don't clash with each other
    var uid = Math.round( Math.random() * 1000) + "" + Math.round( Math.random() * 1000);
    var css = new CssGenerator("viewUtils"+uid, true);
    css.init();
    function clipToElement(selector, element){
        var params = [element.offsetTop, element.offsetLeft+element.offsetWidth, element.offsetTop+element.offsetHeight, element.offsetLeft];
        if(extGlobal.browserGap.isSafari) {
            params = [0, element.offsetLeft+element.offsetWidth, element.offsetTop+element.offsetHeight, element.offsetLeft];
        }
        var clip = { clip: "rect("+params.join("px,")+")" };
        css.addSelector(selector, clip);
    }

    function clearInnerHTML(element){
        while (element.hasChildNodes()){
            element.removeChild(element.firstChild);
        }
    }

    function hideElement(element){
        element.classList.add("displayNone");
    }

    function unhideElement(element){
        element.classList.remove("displayNone");
    }

    /*
        resizeTopSites will center the topSite div container upon resize.
        It is position:absolute where we only show what is available for the user screen.
        Each topSite has a fixed padding left+right=30px, topSites that can't be shown are going to a 2nd line which is
        under the viewport (not visible to the user).
    */
    function resizeTopSites() {
        var topSites = document.querySelectorAll("#topSites div.topSite"),
            topSitesContainer = document.getElementById("topSites"),
            lastVisibleElement = 0,
            lastRightPos,
            clientWidth,
            availableRight,
            availableLeft,
            leftPaddingForCenter;
        if (topSites.length > 0) {
            topSitesContainer.style.padding = '0 30px 0 30px'; //before resizing we reinit padding to 30px left and right
            for (var i = 0; i < topSites.length && isElementVisible(topSites[i]); i++) {
                lastVisibleElement = i;
            }
            lastRightPos = topSites[lastVisibleElement].offsetLeft + topSites[lastVisibleElement].offsetWidth;
            clientWidth = document.documentElement.clientWidth;
            availableRight = clientWidth - lastRightPos;
            availableLeft = topSites[0].offsetLeft;
            leftPaddingForCenter = Math.round((availableLeft + availableRight) / 2);
            topSitesContainer.style.padding = '0 30px 0 ' + leftPaddingForCenter + 'px';
        }
        return lastVisibleElement;
    }

    function isElementVisible(el) {
        var rect     = el.getBoundingClientRect(),
            vWidth   = window.innerWidth || document.documentElement.clientWidth,
            vHeight  = window.innerHeight || document.documentElement.clientHeight,
            efp      = function (x, y) { return document.elementFromPoint(x, y); };
        // Return false if it's not in the viewport - when window is too smal the icons will fall to next line which is below viewport (last condition)
        if ((rect.right < 0 || rect.bottom < 0) || rect.left > vWidth || rect.top > vHeight) {
            return false;
        } else {
            return true;
        }
    }

    function getSearchUrl(queryString){
        var url = "",
            distribChannel = extGlobal.constants.distributionChannels[extGlobal.distributionChannel],
            isFirefox = extGlobal.browserGap.isFirefox,
            isSafari = extGlobal.browserGap.isSafari,
            typeParam = extGlobal.constants.distributionChannels[extGlobal.distributionChannel].typeParam ? extGlobal.constants.distributionChannels[extGlobal.distributionChannel].typeParam : extGlobal.constants.typeParam;
        if(isFirefox){
            url = "https://" + extGlobal.browserGap.getLocalizedString("newtab_extension_search_prov_domain") +
                (distribChannel.hsimp ? "/yhs" : "") +
                "/" + extGlobal.browserGap.getLocalizedString("newtab_extension_search_prov_path") +
                "?p=" + encodeURIComponent(queryString) +
                (distribChannel.hspart ? "&hspart=" + distribChannel.hspart : "") +
                (distribChannel.hsimp ? "&hsimp=" + distribChannel.hsimp : "") +
                (distribChannel.frCodeFirefox && !distribChannel.hsimp ? "&fr=" + distribChannel.frCodeFirefox : "") +
                "&type=" + typeParam;
        }
        else if(isSafari){
            var searchParamSf = distribChannel.searchType === "fr" ? "&fr=" + distribChannel.frCodeSafari : "&hspart=" + distribChannel.hspart + "&hsimp=" + distribChannel.hsimp;
            url = "https://" + extGlobal.browserGap.getLocalizedString("newtab_extension_search_prov_domain") +
                (distribChannel.searchType === "hsimp" ? "/yhs" : "") +
                "/" + extGlobal.browserGap.getLocalizedString("newtab_extension_search_prov_path") +
                "?p=" + encodeURIComponent(queryString) +
                searchParamSf + //for chrome it may be fr code OR hsimp+hspart, depending on config
                "&type=" + typeParam;
        }
        else{
            var searchParam = distribChannel.searchType === "fr" ? "&fr=" + distribChannel.frCodeChrome : "&hspart=" + distribChannel.hspart + "&hsimp=" + distribChannel.hsimp;
            url = "https://" + extGlobal.browserGap.getLocalizedString("newtab_extension_search_prov_domain") +
                (distribChannel.searchType === "hsimp" ? "/yhs" : "") +
                "/" + extGlobal.browserGap.getLocalizedString("newtab_extension_search_prov_path") +
                "?p=" + encodeURIComponent(queryString) +
                searchParam + //for chrome it may be fr code OR hsimp+hspart, depending on config
                "&type=" + typeParam;
        }
        return url;
    }

    // TODO: need fr2 code and urls on FF and partners
    function getTrendingNowUrl(queryString){
        if (!queryString) {
            return "";
        }

        var distribChannel = extGlobal.constants.distributionChannels[extGlobal.distributionChannel],
            isFirefox = extGlobal.browserGap.isFirefox,
            type = distribChannel.trendingNow && distribChannel.trendingNow.type ? distribChannel.trendingNow.type : "",
            url = "";

        url = "https://" + extGlobal.browserGap.getLocalizedString("newtab_extension_search_prov_domain") +
            "/" + extGlobal.browserGap.getLocalizedString("newtab_extension_search_prov_path") +
            "?p=" + encodeURIComponent(queryString) +
            (isFirefox ? "" : "&fr=yset_chr_syc_tn") +
            (type ? "&type=" + type : "");

        return url;
    }

    function setTnViewParams (newTabData, beaconParams) {
        var enableTN = newTabData.enableTN || false;
        var tnData = newTabData.trendingNowData || null;
        var tnItems;

        if (enableTN) {
            beaconParams.tn_enable = "1";

            if (tnData) {
                tnData = JSON.parse(tnData);
                tnItems = tnData.items || [];
                beaconParams.tn_num = (tnItems.length || 0).toString();
            } else {
                beaconParams.tn_num = "0";
            }
        } else {
            beaconParams.tn_enable = "0";
            beaconParams.tn_num = "0";
        }
    }

    function setPartnerSiteFlag (newTabData, beaconParams, partners, blackList) {
        var partnerList = [],
            isBlacklist;
        Object.keys(partners).forEach(function (key) {
            isBlacklist = false;
            for (var i = 0; i < blackList.length; i++) {
                if (blackList[i] === partners[key].url) {
                    isBlacklist = true;
                }
            }
            if (!isBlacklist) {
                partnerList.push(partners[key].title);
            }
        });
        beaconParams.partner_sites = partnerList.join(",");
    }

    this.hideElement = hideElement;
    this.unhideElement = unhideElement;
    this.clearInnerHTML = clearInnerHTML;
    this.clipToElement = clipToElement;
    this.resizeTopSites = resizeTopSites;
    this.getSearchUrl = getSearchUrl;
    this.getTrendingNowUrl = getTrendingNowUrl;
    this.setTnViewParams = setTnViewParams;
    this.setPartnerSiteFlag = setPartnerSiteFlag;
    return this;
}

/* globals exports */
function Constants(){ //jshint ignore : line
    //Common constants
    this.accepted_photos_index = "acceptedPhotosIdx";
    this.cache_threshold_number = 5;
    this.next_cache_size = 10;
    this.flickr_url = "https://api.flickr.com/services/rest/?method=flickr.groups.pools.getPhotos&api_key=32bfc00e235f47bb899bd432ae01f7a7&group_id=2768627@N24&format=json&nojsoncallback=1&extras=owner_name,url_k,url_l,url_m,media&per_page=500&page=";
    this.tn_url = "https://s.yimg.com/pv/trending/us_general.json";
    this.befrugal_url = "http://www.befrugal.com/lp/yahoo";
    this.tn_interval = 300000; //Trending Now stories will be updated every 5 mins
    this.video_media = "video";
    this.ratio_min = 1.0;//1.4;
    this.ratio_max = 1.85;
    this.width5 = 1175;
    this.width4 = 920;
    this.width3 = 580;
    this.timeout_serverError = 1800000;
    this.timeout_ffOffline = 60000;
    this.uiContainerWidth = 360;
    this.uiContainerWithSearchProtectWidth = 420;
    this.topSitesRefreshTime = 3600000;
    this.titleStringLength = 18;
    this.ffTopSites = 20;
    this.tracker_page_info = "page_info";
    this.tracker_click_info = "click_info";
    this.tracker_install = 'install';
    this.tracker_upgrade = 'upgrade';
    this.tracker_uninstall = 'uninstall';
    this.tracker_alive = 'live';
    this.tracker_search_modified = 'modified';
    this.tracker_alive_ping_aggressive_time = 86400000; // aggressive for 1 day
    this.tracker_alive_ping_aggressive_interval = 3600000;// 1 hr while agressive
    this.tracker_alive_ping_interval = 28800000 ;// 8 hrs = 8 * 60 * 60 * 1000 milli sec.
    this.tracker_gpos_topsites = 1;
    this.tracker_gpos_search_protect_panel = 2;
    this.tracker_gpos_flickr = 3;
    this.tracker_gpos_feedback = 5;
    this.tracker_gpos_search_box = 4;
    this.tracker_flickrArea_p_owner = 1;
    this.tracker_flickrArea_p_flickrlogo =2;
    this.tracker_searchArea_p_search_box = 1;
    this.tracker_searchArea_p_search_suggestion = 2;
    this.tracker_feedbackArea_p_feedback = 1;
    this.tracker_topSitesArea_p_edit = 11;
    this.tracker_topSitesArea_p_done = 12;
    this.tracker_searchArea_slk_search_box = "newtab_search_box";
    this.tracker_searchArea_slk_search_suggestion = "newtab_search_suggestion";
    this.tracker_vtestid = "default";
    this.keycode_up = 38;
    this.keycode_down = 40;
    this.suggestionDisplayCount = 6;
    this.initialSuggestIndex = -1;
    this.tracker_browser_chr = "chr";
    this.tracker_browser_ff = "ff";
    this.tracker_browser_sf = "sf";
    this.maxBgPhotosStored = 50;
    this.splicePercent = 0.5;
    this.acceptedPhotosRemaining = 20;
    this.feedBackDistance = 24;
    this.rightToggleViewDistance = 25;
    this.iconToggleDistance = 4;
    this.iconsPerRow = 9;
    this.shortenStringLength = 25;
    this.locationAPI = "http://ip-api.com/json";
    this.distributionChannelPrefKey = "yahoo-newtab-distribution-channel";
    this.userSearchSetChoice = "yahoo-newtab-user-searchset";
    this.defaultDistFFTabFound = "external-oo"; //if FF addon store tab is found but there is no url param &src= then we will use this default value (external-oo > revenue is for yahoo only)
    this.distributionDefaultChannel = "external-oracle"; //in case of oracle the addon is installed in the background, addon store tab will not be found meaning this is Oracle install
    this.distributionChannels = {
        "external-oracle": {
           "frCodeChrome": "yset_chr_syc_oracle",
           "frCodeFirefox": "yset_ff_syc_oracle",
           "partnerCode": "oracle",
           "chrome_space_id": 151340119,
           "firefox_space_id": 151340118,
           "searchType": "fr",
           "trendingNow": {
               "type": "orcl"
           },
           "amp_desc_dist": "oracle"
        },
        "external-oracle-v1": {
           "frCodeChrome": "yset_chr_syc_oracle",
           "frCodeFirefox": "yset_ff_syc_oracle",
           "partnerCode": "oracle",
           "chrome_space_id": 151340119,
           "firefox_space_id": 151340118,
           "searchType": "fr",
           "trendingNow": {
               "type": "orcl"
           },
           "amp_desc_dist": "oracle"
        },
        "external-bundled": {
           "hsimp": "yhs-009",
           "hspart": "mozilla",
           "frCodeChrome": "yset_chr_cnewtab",
           "frCodeFirefox": "yset_ff_hp_cnewtab",
           "partnerCode": "yahoo",
           "searchType": "fr",
           "amp_desc_dist": "bundle"
        },
        "external-oo": {
           "hsimp": "yhs-102",
           "hspart": "mozilla",
           "frCodeChrome": "yset_chr_cnewtab",
           "frCodeFirefox": "yset_ff_hp_cnewtab",
           "frCodeSafari": "yset_sf_cnewtab",
           "partnerCode": "yahoo",
           "searchType": "fr",
           "trendingNow": {
               "type": "ono"
           },
           "amp_desc_dist": "oo"
        },
        "external-tb": {
           "hsimp": "yhs-100",
           "hspart": "mozilla",
           "frCodeChrome": "yset_chr_cnewtab",
           "frCodeFirefox": "yset_ff_hp_cnewtab",
           "partnerCode": "yahoo",
           "searchType": "fr",
           "trendingNow": {
               "type": "ono"
           },
           "typeParam": "bundle_newtab",
           "typeDefault": "bundle_default",
           "amp_desc_dist": "tb"
        },
        "external-oo-win-installer": {
           "hsimp": "yhs-102",
           "hspart": "mozilla",
           "frCodeChrome": "yset_chr_syc_oo",
           "frCodeFirefox": "yset_ff_hp_cnewtab",
           "partnerCode": "yahoo",
           "searchType": "fr",
           "trendingNow": {
               "type": "ono"
           },
           "typeParam": "bundle_newtab",
           "typeDefault": "bundle_default",
           "amp_desc_dist": "win-installer"
        },
        "external-amo": {
           "hsimp": "yhs-102",
           "hspart": "mozilla",
           "frCodeChrome": "yset_chr_cnewtab",
           "frCodeFirefox": "yset_ff_hp_cnewtab",
           "partnerCode": "yahoo",
           "searchType": "fr",
           "amp_desc_dist": "amo"
        },
        "external-medianet": {
           "hsimp": "yhs-001",
           "hspart": "mnet",
           "frCodeChrome": "yset_chr_cnewtab",
           "frCodeFirefox": "yset_ff_hp_cnewtab",
           "partnerCode": "yahoo",
           "searchType": "hsimp",
           "amp_desc_dist": "medianet"
        },
        "external-ddc": {
           "hsimp": "yhs-domaindev_pdfonline",
           "hspart": "domaindev",
           "frCodeChrome": "yset_chr_cnewtab",
           "frCodeFirefox": "yset_ff_hp_cnewtab",
           "partnerCode": "yahoo",
           "searchType": "hsimp",
           "amp_desc_dist": "ddc"
        },
        "external-comodo": {
           "hsimp": "yhs-ccs",
           "hspart": "comodo",
           "frCodeChrome": "yset_chr_cnewtab",
           "frCodeFirefox": "yset_ff_hp_cnewtab",
           "partnerCode": "yahoo",
           "searchType": "hsimp",
           "amp_desc_dist": "comodo"
        },
        "external-adco": {
           "hsimp": "yhs-ambe_newtab_ff",
           "hspart": "ambe",
           "frCodeChrome": "amb_ext",
           "frCodeFirefox": "amb_ext",
           "partnerCode": "yahoo",
           "searchType": "fr",
           "amp_desc_dist": "adco"
        }
    };

    this.amp_desc_type = "newtab";
    this.amp_desc_dist_default = "oo";

    //Common distribution variables
    this.typeParam = "newtab";
    this.typeDefault = "default";
    this.typeIcon = "icon";
    this.typeHomePage = "hpset";
    this.chrome_space_id = 151340124;
    this.firefox_space_id = 151340125;
    this.safari_space_id = 151340134;


    //Firefox Specific Constants
    this.amo_addon_url_regexp = "addons\.mozilla\.org\/.*\/firefox\/addon\/search-and-new-tab-by-yahoo"; // .* is for language, which could be en-US, fr, etc.
    this.chrome_ext_url_pattern = "*://chrome.google.com/webstore/detail/search-and-new-tab-by-yah*";
    this.browser_newtab_url = "browser.yahoo.newtab.url";
    this.extensions_newtab_oldnewtab_url = "extensions.yahoo.newtab.oldnewtab.url";
    this.yahoo_newtab_focus = "yahoo-newtab-focus";
    this.default_newtab_focus = "omnibox";
    this.searchbox_newtab_focus = "yahoo_newtab_search";
    this.engine_default = "engine-default";
    this.engine_current = "engine-current";
    this.protect_interval = 1296000000; // = 15 days = 15 * 24 * 60 * 60 * 1000 milli sec.
    this.yahoo_custom_search_engine_name = "Yahoo Partner";
    this.yahoo_custom_search_engine_name_old = "Yahoo Web";
    this.yahoo_inbuilt_search_engine_name = "Yahoo";
    this.profile_directory = "ProfD";
    this.yahoo_folder = "Yahoo Inc";
    this.yahoo_search_xml = "yahoo.xml";
    this.yahoo_syc_search_xml = "yahoo-web.xml";
    this.yset_state_json = "ysetState.json";
    this.tag_url = "Url";
    this.tag_param = "Param";
    this.attribute_name = "name";
    this.attribute_value = "value";
    this.attribute_template = "template";
    this.text_xml = "text/xml";
    this.general_useragent_locale = "general.useragent.locale";
    this.search_protect_accept = "acceptDiv";
    this.search_protect_decline = "declineButton";
    this.tracker_searchProtectArea_p_accept = 1;
    this.tracker_searchProtectArea_p_decline = 2;
    this.tracker_gpos_searchSetDialog = 5;
    this.tracker_searchSetDialog_p_okay = 1;
    this.tracker_searchSetDialog_p_cancel = 2;
    this.tracker_searchSetDialog_sec_okay = "ff_searchset_dialog_okay";
    this.tracker_searchSetDialog_sec_cancel = "ff_searchset_dialog_cancel";
    this.tracker_searchSetDialog_slk_okay = "okay";
    this.tracker_searchSetDialog_slk_cancel = "cancel";
    this.tracker_searchSet_delc = "ext_ss";
    this.tracker_reject = "reject";
    this.old_home_page = "old_home_page_url";
    this.old_search_provider = "old_search_provider_name";
    this.browser_homepage_pref = "browser.startup.homepage";
    this.search_hspart_val = "mozilla";
    this.localized_strings_keys_ff = [
        "newtab_extension_search_box_label",
        "newtab_extension_photo_label",
        "newtab_extension_on_flickr",
        "newtab_extension_tab_title",
        "newtab_firefox_extension_search_protect_prompt_part1",
        "newtab_firefox_extension_search_protect_prompt_part2",
        "newtab_firefox_extension_search_protect_accept",
        "newtab_firefox_extension_search_protect_decline",
        "newtab_extension_show_image",
        "newtab_extension_show_topsites",
        "newtab_extension_feedback_link_label",
        "newtab_extension_feedback_link",
        "newtab_extension_trending_now_label",
        "newtab_extension_add_url",
        "newtab_extension_add_title",
        "newtab_extension_enter_url",
        "newtab_extension_enter_title",
        "newtab_extension_edit_settings_label",
        "newtab_extension_done_settings_label",
		"newtab_extension_homepage_url",
        "newtab_extension_search_frCode",
        "newtab_extension_hide_tn",
        "newtab_extension_show_tn"
    ];
    this.localized_search_strings_keys_ff = [
        "newtab_extension_search_prov_domain",
        "newtab_extension_search_prov_path",
        "newtab_extension_search_suggest_domain",
        "newtab_extension_search_suggest_path"
    ];
    this.localized_weather_strings_keys_ff = [
        "tornado_label", 
        "tropical_storm_label",
        "hurricane_label", 
        "severe_thunderstorms_label", 
        "thunderstorms_label",
        "mixed_rain_and_snow_label", 
        "mixed_rain_and_sleet_label", 
        "mixed_snow_and_sleet_label", 
        "freezing_drizzle_label", 
        "drizzle_label", 
        "freezing_rain_label", 
        "showers_label", 
        "snow_flurries_label", 
        "light_snow_showers_label", 
        "blowing_snow_label", 
        "snow_label", 
        "hail_label", 
        "sleet_label", 
        "dust_label", 
        "foggy_label", 
        "haze_label", 
        "smoky_label", 
        "blustery_label", 
        "windy_label", 
        "cold_label", 
        "cloudy_label", 
        "mostly_cloudy_label", 
        "partly_cloudy_label", 
        "clear_label", 
        "sunny_label", 
        "fair_label", 
        "mixed_rain_and_hail_label", 
        "hot_label",
        "isolated_thunderstorms_label", 
        "scattered_thunderstorms_label", 
        "scattered_thunderstorms_label", 
        "scattered_showers_label", 
        "heavy_snow_label", 
        "scattered_snow_showers_label", 
        "thundershowers_label", 
        "snow_showers_label",
        "isolated_thundershowers_label"
    ];
    this.ff_newtab_localization = {
      "New Tab": true, //en-US, en-GB
      "Nova aba": true, //pt-BR
      "Neuer Tab": true, //de
      "Nueva pestaña": true, //es-ES, es-MX, es-AR, es-CL
      "Nouvel onglet": true, //fr
      "新分頁": true, //zh-TW
      "Nuova scheda": true, //it
      "Ny flik": true, //sv-SE
      "Tab mới": true, //vi
      "แท็บใหม่": true, //th
      "Tab Baru": true, //id
      "Novo separador": true, //pt-PT
      "Nieuw tabblad": true, //nl
      "Новая вкладка": true, //ru
      "Uusi välilehti": true, //fi
      "Nowa karta": true, //pl
      "Nyt faneblad": true, //da
      "Pestanya nova": true, //ca
      "Ny fane": true, //nb-NO
      "Filă nouă": true, //ro
      "لسان جديد": true, //ar
      "Yeni sekme": true, //tr
      "新規タブ": true, //jp
      "新标签页": true //zh-CN
    };

    //Chrome Specific Contstants
    this.clueAttemptCount = 5;
    this.clueAttemptTimeout = 5 * 1000;
    this.chromeUninstallURL = "https://www.yahoo.com/?fr=yset_chr_ext_exit";

    //Bucket Tracking
    this.bucket_freshInstall = "freshInstall";
    this.bucket_permissions = {};
    this.bucket_upgradePath = {};

    
}

function Bucket(permissions, unittests){ //jshint ignore: line 
    var currentBucket = {};

    function init(){
        var storedBucket = JSON.parse(extGlobal.browserGap.localStorage.getItem("bucket"));
        currentBucket = storedBucket || {name: extGlobal.constants.bucket_freshInstall, ts: (new Date()).getTime()};
        updateBucket();
        saveBucketData();
        permissions = extGlobal.constants.bucket_permissions[currentBucket.name];
    }

    function updateBucket(){
        if(extGlobal.constants.bucket_upgradePath[currentBucket.name]){
            currentBucket = {name: extGlobal.constants.bucket_upgradePath[currentBucket.name], ts: (new Date()).getTime()};
        }
    }

    function saveBucketData(){
        extGlobal.browserGap.localStorage.setItem("bucket", JSON.stringify(currentBucket));
    }

    function checkPermission(permissionName){
        if(permissions){
            return permissions[permissionName] !== undefined ? permissions[permissionName] : false;
        } else{
            return false;
        }
    }

    function getPermissionMap(){
        return permissions || {};
    }

    this.init = extGlobal.browserGap.isContentScript ? undefined : init;
    this.checkPermission = checkPermission;
    this.getPermissionMap = getPermissionMap;

    if(unittests){
        this.currentBucket = currentBucket;
        this.syncData = function(){
            this.currentBucket = currentBucket;
        };
    }
    return this;
}

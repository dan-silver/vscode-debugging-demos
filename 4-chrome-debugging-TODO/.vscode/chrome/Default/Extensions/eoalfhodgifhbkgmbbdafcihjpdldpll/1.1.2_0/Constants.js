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

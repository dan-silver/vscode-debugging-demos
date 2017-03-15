function Weather(){ // jshint ignore: line 
    
    var city = "",
        region = "",
        degree = "",
        highDegree = "",
        lowDegree = "",
        desc = "",
        code = "",
        locationObj = [], //location api response
        weatherObj = []; //weather api response

    function refreshWeatherDataCache(){

        var retObj = [];
            
            getLocation(function(locationObj){

                city = locationObj.city;
                region = locationObj.region;
                var encodedLocationStr = encodeURIComponent(city + ", " + region);
                extGlobal.browserGap.localStorage.setItem("localStorageLocation", encodedLocationStr);

                getWeatherInfo(encodedLocationStr, function(weatherObj){

                    degree = weatherObj.item.condition.temp;
                    highDegree = weatherObj.item.forecast[0].high;
                    lowDegree = weatherObj.item.forecast[0].low;
                    desc = weatherObj.item.condition.text;
                    code = weatherObj.item.condition.code;
                    retObj = {"degree": degree, "degreeC": fToCDegree(degree), "highDegree": highDegree, "highDegreeC": fToCDegree(highDegree), "lowDegree": lowDegree, "lowDegreeC": fToCDegree(lowDegree), "desc": desc, "code":code};
                    extGlobal.browserGap.localStorage.setItem("localStorageWeather", JSON.stringify(retObj));
                
                });

            });
    }

    function getLocation(callback)
    {
        var url = extGlobal.constants.locationAPI;
        var result= function(responseText)
        {
            locationObj = JSON.parse(responseText);
            callback(locationObj);
        };
        var err = function(errCode){
            console.log("location api call failed :( ");
            if(errCode >= 500){
                console.log("server-side error... wait 3 minutes before trying again");
                setTimeout(function(){
                    extGlobal.browserGap.xhr(url,result,err);
                }, extGlobal.constants.timeout_serverError);
            } else if(!extGlobal.browserGap.isOnline() && extGlobal.browserGap.isChrome) {
                console.log("waiting for internet connection to try again.");
                extGlobal.browserGap.onceOnline(function(){
                    console.log("reconnected to the internet!");
                    extGlobal.browserGap.xhr(url,result,err);
                });
            } else if(errCode === 0 && extGlobal.browserGap.isFirefox){
                console.log("Firefox is most likely offline. timeout to try again in a minute.");
                setTimeout(function(){
                    extGlobal.browserGap.xhr(url,result,err);
                }, extGlobal.constants.timeout_ffOffline);
            }
        };
        extGlobal.browserGap.xhr(url, result, err);
    }

    function getWeatherInfo(locationStr, callback) {

        var url = "https://query.yahooapis.com/v1/public/yql?q=select%20*%20from%20weather.forecast%20where%20woeid%20in%20(select%20woeid%20from%20geo.places(1)%20where%20text%3D%22" + locationStr + "%22)&format=json&env=store%3A%2F%2Fdatatables.org%2Falltableswithkeys";
        var result= function(responseText)
        {
                weatherObj = JSON.parse(responseText).query.results.channel;
                callback(weatherObj);
        };
        var err = function(errCode){
            console.log("weather api call failed :( ");
            if(errCode >= 500){
                console.log("server-side error... wait 3 minutes before trying again");
                setTimeout(function(){
                    extGlobal.browserGap.xhr(url,result,err);
                }, extGlobal.constants.timeout_serverError);
            } else if(!extGlobal.browserGap.isOnline() && extGlobal.browserGap.isChrome) {
                console.log("waiting for internet connection to try again.");
                extGlobal.browserGap.onceOnline(function(){
                    console.log("reconnected to the internet!");
                    extGlobal.browserGap.xhr(url,result,err);
                });
            } else if(errCode === 0 && extGlobal.browserGap.isFirefox){
                console.log("Firefox is most likely offline. timeout to try again in a minute.");
                setTimeout(function(){
                    extGlobal.browserGap.xhr(url,result,err);
                }, extGlobal.constants.timeout_ffOffline);
            }
        };
        extGlobal.browserGap.xhr(url, result, err);
     } 

    function fToCDegree(fDeg)
    {
        if(!fDeg)
        {
            return "";
        }
        else
        {
            return "" + Math.round(((fDeg - 32) * (5/9)));   
        } 
        
    }

    function init()
    {
        //do initial caching of location and weather data
        //refreshWeatherDataCache();

        //set an interval to refresh location and weather cache every half hour
        //setInterval(function(){ refreshWeatherDataCache(); }, 1800000);
    }

    this.init = init;
    this.refreshWeatherDataCache = refreshWeatherDataCache;
    this.getWeatherInfo = getWeatherInfo;
    this.getLocation = getLocation;
    this.fToCDegree = fToCDegree;

    return this;

}

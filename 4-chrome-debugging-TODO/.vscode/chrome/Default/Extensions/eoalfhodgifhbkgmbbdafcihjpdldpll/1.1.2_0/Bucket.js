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

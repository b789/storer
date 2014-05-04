var angulargap = angular.module("angulargap", []);
angulargap.controller("HomeController", function ($scope) {
    $scope.message = "AngularJS!";


    $scope.info = {
        tokenasd: "",

        hashasd : "",

        psw : "",

        pswasd : false,

        currentSite : "",

        currentUser : "",

        currentPassword : "",

        data : [],

        addasd : false
    };


    //https://developers.google.com/drive/v2/reference/files/get - list
//https://developers.google.com/drive/web/manage-uploads#multipart
//https://developers.google.com/drive/v2/reference/files/update
    $scope.googleapi = {
        setToken: function(data) {


            //Cache the token
            localStorage.access_token = data.access_token;
            //Cache the refresh token, if there is one
            $scope.info.tokenasd = data.access_token;

            localStorage.refresh_token = data.refresh_token || localStorage.refresh_token;
            //Figure out when the token will expire by using the current
            //time, plus the valid time (in seconds), minus a 1 minute buffer
            var expiresAt = new Date().getTime() + parseInt(data.expires_in, 10) * 1000 - 60000;
            localStorage.expires_at = expiresAt;
            $scope.$apply();
        },
        authorize: function(options) {
            var deferred = $.Deferred();

            //Build the OAuth consent page URL
            var authUrl = 'https://accounts.google.com/o/oauth2/auth?' + $.param({
                client_id: options.client_id,
                redirect_uri: options.redirect_uri,
                response_type: 'code',
                scope: options.scope
            });

            //Open the OAuth consent page in the InAppBrowser
            var authWindow = window.open(authUrl, '_blank', 'location=no,toolbar=no');

            $(authWindow).on('loadstart', function(e) {
                var url = e.originalEvent.url;
                var code = /\?code=(.+)$/.exec(url);
                var error = /\?error=(.+)$/.exec(url);

                if (code || error) {
                    //Always close the browser when match is found
                    authWindow.close();
                }

                if (code) {
                    //Exchange the authorization code for an access token
                    $.post('https://accounts.google.com/o/oauth2/token', {
                        code: code[1],
                        client_id: options.client_id,
                        client_secret: options.client_secret,
                        redirect_uri: options.redirect_uri,
                        grant_type: 'authorization_code'
                    }).done(function(data) {

                        $scope.googleapi.setToken(data);
//                        deferred.resolve(data);
                    }).fail(function(response) {
                        alert("bad");
//                        deferred.reject(response.responseJSON);
                    });
                } else if (error) {
                    //The user denied access to the app
                    deferred.reject({
                        error: error[1]
                    });
                }
            });

            return deferred.promise();
        },
        getToken: function(options) {
            var deferred = $.Deferred();

            if (new Date().getTime() < localStorage.expires_at) {
                deferred.resolve({
                    access_token: localStorage.access_token
                });
            } else if (localStorage.refresh_token) {
                $.post('https://accounts.google.com/o/oauth2/token', {
                    refresh_token: localStorage.refresh_token,
                    client_id: options.client_id,
                    client_secret: options.client_secret,
                    grant_type: 'refresh_token'
                }).done(function(data) {
                    $scope.googleapi.setToken(data);
                    deferred.resolve(data);
                }).fail(function(response) {
                    alert("fail: Token");
                    deferred.reject(response.responseJSON);
                });
            } else {
//                alert("??");
                deferred.reject();
            }

            return deferred.promise();
        },
        userInfo: function(options) {
            return $.getJSON('https://www.googleapis.com/oauth2/v1/userinfo', options);
        },
        tokenInfo: function() {
            $scope.googleapi.getToken({
                client_id: $scope.app.client_id,
                client_secret: $scope.app.client_secret
            }).then(function(data) {
                return $.getJSON("https://www.googleapis.com/oauth2/v1/tokeninfo?access_token=" + data.access_token);
            });
        },
        getFile: function (){
            $scope.googleapi.getToken({
                client_id: $scope.app.client_id,
                client_secret: $scope.app.client_secret
            }).then(function(data) {
                var xhr = new XMLHttpRequest();
                xhr.open('GET', localStorage.link);
                xhr.setRequestHeader('Authorization', 'Bearer ' + data.access_token);
                xhr.onload = function (e) {
                    if (JSON.stringify(xhr.response)=='""') {
                        alert("No response");
//                        $scope.info.data={"accounts":[]};
                    }else {
                        $scope.info.data=JSON.parse($scope.app.cript(xhr.response));
                    }
                    $scope.$apply();

                };
                xhr.onerror = function () {
                    alert("error");
                };
                xhr.send();

            });


        },
        getFileList: function () {

            $scope.googleapi.getToken({
                client_id: $scope.app.client_id,
                client_secret: $scope.app.client_secret
            }).then(function (data) {
                var xhr = new XMLHttpRequest();
                xhr.open('GET', "https://www.googleapis.com/drive/v2/files");
                xhr.setRequestHeader('Authorization', 'Bearer ' + data.access_token);
                xhr.onload = function (e) {
                    var items = JSON.parse(xhr.response).items;
                    alert("bib");
                    alert(items.length);
                    var i =0;
                    var trovato = false;
                    for (i = 0, len = items.length; i < len; i++) {
                        if (items[i].title=="File.txt" && items[i].labels.trashed == false) {

                            trovato = true;
                            localStorage.link = items[i].downloadUrl;
                            break;
                        }

                    }
                    alert(i);
                    alert(trovato);
                    alert(localStorage.link);

                };
                xhr.onerror = function () {
                    alert("errorrrrrrrrrrr");
                };
                xhr.send();

            });
        },
        saveFile :function (json) {

                $scope.googleapi.getToken({
                    client_id: $scope.app.client_id,
                    client_secret: $scope.app.client_secret
                }).then(function(data) {

                    var content = $scope.app.cript(json);

                    xhr = new XMLHttpRequest(),
                        bound = "========",
                        meta = {
                            "title": 'File.txt',
                            "mimeType": 'text/plain',
                            "description": "This image is created by canvas"
                        },
                        multiparts = [];

                    multiparts = [];
                    multiparts.push('--' + bound);
                    multiparts.push('Content-Type: application/json');
                    multiparts.push('');
                    multiparts.push(JSON.stringify(meta));
                    multiparts.push('--' + bound);
                    multiparts.push('Content-Type: image/png');
                    multiparts.push('Content-Transfer-Encoding: base64');
                    multiparts.push('');
                    multiparts.push(btoa(content));   //mettere qui json string
                    multiparts.push('--' + bound + '--');

                    var url="";
                    var type="";
//                    alert(localStorage.fileId);
                    if (localStorage.fileId == undefined) {

                        url = "https://www.googleapis.com/upload/drive/v2/files?uploadType=multipart&access_token=";
                        type = "POST";
                    } else {

                        url = "https://www.googleapis.com/upload/drive/v2/files/"+localStorage.fileId+"?uploadType=multipart&access_token=";
                        type = "PUT";
                    }

                    xhr.open(type, url + data.access_token, true);
                    xhr.setRequestHeader("Content-Type", "multipart/mixed; boundary=" + bound);

                    xhr.onload = function(e) {
                        var jsResponse = JSON.parse(xhr.responseText);
                        var fileId = jsResponse.id;
                        var link = jsResponse.downloadUrl;

                        localStorage.fileId = fileId;
                        localStorage.link = link;

//                        alert(JSON.stringify(jsResponse));
                    };

                    xhr.send(multiparts.join("\r\n"))

                });

//            }
        }
    };




    $scope.app = {
        client_id: 'c',
        client_secret: 'c',
        redirect_uri: 'http://localhost',                             //drive.appdata, drive.apps.readonly, drive.file, drive.metadata.readonly, drive.readonly
        scope: 'https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/drive https://www.googleapis.com/auth/drive.appdata https://www.googleapis.com/auth/drive.apps.readonly https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/drive.metadata.readonly https://www.googleapis.com/auth/drive.readonly',
//https://www.googleapis.com/auth/drive
//https://www.googleapis.com/auth/userinfo.profile
        init: function() {
            $('#login a').on('click', function() {
                $scope.app.onLoginButtonClick();
            });

            $('#button').on('click', function() {
                $scope.app.onUploadButtonClick();
            });
        },

        onLoginButtonClick: function() {
            $scope.googleapi.authorize({
                client_id: this.client_id,
                client_secret: this.client_secret,
                redirect_uri: this.redirect_uri,
                scope: this.scope
            }).done(function() {
                //Show the greet view if access is granted
                alert("Authorization granted");
                $scope.app.showGreetView();
            }).fail(function(data) {
                alert("ko");
                //Show an error message if access was denied
                $('#login p').html(data.error+"aq");
            });
        },
        computeHash: function(string) {
            var hash = 0, i, chr, len;
            if (string.length == 0) return hash;
            for (i = 0, len = string.length; i < len; i++) {
                chr   = string.charCodeAt(i);
                hash  = ((hash << 5) - hash) + chr;
                hash |= 0; // Convert to 32bit integer
            }
            return hash;
        },
        logIn: function() {
            var hash = $scope.app.computeHash($scope.info.psw);
            if ($scope.info.hashasd=="") {  //prima volta
                localStorage.hash = hash;
                $scope.info.hashasd = hash;
                $scope.info.pswasd = true;
                alert("Password saved");
                $scope.$apply();
            } else {
                if (hash==$scope.info.hashasd) {
                    alert("Access granted");
                    $scope.info.pswasd = true;
                    $scope.$apply();
                } else {
                    alert("Wrong password");
                }
            }

        },
        cript: function(info) {  // "cript"
            var hashString = $scope.info.hashasd.toString();
            var hashLen = hashString.length;
            var i=0;
            var res = "";
            for (i = 0, len = info.length; i < len; i++) {
                var infoChar = info.charCodeAt(i);
                var hashChar = hashString.charCodeAt(i % hashLen);
                res = res + String.fromCharCode(infoChar ^ hashChar);
            }
            return (res);
        },
        saveAccount: function() {
            $scope.info.data.push({"site": $scope.info.currentSite, "user": $scope.info.currentUser, "psw": $scope.info.currentPassword});
            $scope.googleapi.saveFile(JSON.stringify($scope.info.data));
            $scope.info.addasd = false;
        },
        removeAccount: function(el) {
            var index = $scope.info.data.indexOf(el);
            $scope.info.data.splice(index, 1);
            $scope.googleapi.saveFile(JSON.stringify($scope.info.data));

        },
        add: function() {
            $scope.info.currentSite = "";
            $scope.info.currentUser = "";
            $scope.info.currentPassword = "";

            $scope.info.addasd = true;
        },
        initTokenHash: function() {
            if (localStorage.hash==undefined) {
                $scope.info.hashasd ="";
            } else {
                $scope.info.hashasd = localStorage.hash;
            }
            if (localStorage.access_token==undefined) {
                $scope.info.tokenasd ="";
            } else {
                $scope.info.tokenasd = localStorage.access_token;
            }
        }


    };


    $scope.app.initTokenHash();

    if (localStorage.link == undefined) {
        $scope.googleapi.getFileList();
    }

    $scope.googleapi.getFile();

});


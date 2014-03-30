var googleapi = {
    setToken: function(data) {
        //Cache the token
        localStorage.access_token = data.access_token;
        //Cache the refresh token, if there is one
        localStorage.refresh_token = data.refresh_token || localStorage.refresh_token;
        //Figure out when the token will expire by using the current
        //time, plus the valid time (in seconds), minus a 1 minute buffer
        var expiresAt = new Date().getTime() + parseInt(data.expires_in, 10) * 1000 - 60000;
        localStorage.expires_at = expiresAt;
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

        //The recommendation is to use the redirect_uri "urn:ietf:wg:oauth:2.0:oob"
        //which sets the authorization code in the browser's title. However, we can't
        //access the title of the InAppBrowser.
        //
        //Instead, we pass a bogus redirect_uri of "http://localhost", which means the
        //authorization code will get set in the url. We can access the url in the
        //loadstart and loadstop events. So if we bind the loadstart event, we can
        //find the authorization code and close the InAppBrowser after the user
        //has granted us access to their data.
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

                    alert("b");
                    googleapi.setToken(data);
                    deferred.resolve(data);
                }).fail(function(response) {
                    alert("v");
                    alert(response.responseJSON);
                    deferred.reject(response.responseJSON);
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
                googleapi.setToken(data);
                deferred.resolve(data);
            }).fail(function(response) {
                deferred.reject(response.responseJSON);
            });
        } else {
            deferred.reject();
        }

        return deferred.promise();
    },
    userInfo: function(options) {
        return $.getJSON('https://www.googleapis.com/oauth2/v1/userinfo', options);
    },
    getFile: function() {

    }
};

function uploadFile(evt) {
    alert("fa");
    insertFile(evt.target.files[0]);
//    gapi.client.load('drive', 'v2', function() {
//        var file = evt.target.files[0];
//        insertFile(file);
//    });
}

function insertFile(fileData) {

    var reader = new FileReader();
    reader.readAsBinaryString(fileData);

    reader.onload = function(e) {

        googleapi.getToken({
            client_id: this.client_id,
            client_secret: this.client_secret
        }).then(function(data) {
            alert(JSON.stringify(data));

            xhr = new XMLHttpRequest(),
                bound = "========",
                meta = {
                    "title": fileData.name,
                    "mimeType": fileData.type || 'application/octet-stream',
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
            multiparts.push(btoa(reader.result));
            multiparts.push('--' + bound + '--');

            var url="";
            var type="";
            alert(localStorage.fileId);
            if (localStorage.fileId == undefined) {
                alert("1");
                url = "https://www.googleapis.com/upload/drive/v2/files?uploadType=multipart&access_token=";
                type = "POST";
            } else {
                alert("2");
                url = "https://www.googleapis.com/upload/drive/v2/files/"+localStorage.fileId+"?uploadType=multipart&access_token=";
                type = "PUT";
            }

            xhr.open(type, url + data.access_token, true);
            xhr.setRequestHeader("Content-Type", "multipart/mixed; boundary=" + bound);

            xhr.onload = function(e) {
                var jsResponse = JSON.parse(xhr.responseText);
                var fileId = jsResponse.id;
                var link = jsResponse.selfLink;

                localStorage.fileId = fileId;
                localStorage.link = link;

                alert(JSON.stringify(jsResponse));
            };

            xhr.send(multiparts.join("\r\n"))

        });

    }
};

var app = {
    client_id: 'client_id',
    client_secret: 'client_secret',
    redirect_uri: 'http://localhost',
    scope: 'https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/drive',
//https://www.googleapis.com/auth/drive
//https://www.googleapis.com/auth/userinfo.profile
    init: function() {
        $('#login a').on('click', function() {
            app.onLoginButtonClick();
        });

        $('#button').on('click', function() {
            app.onUploadButtonClick();
        });
        //Check if we have a valid token
        //cached or if we can get a new
        //one using a refresh token.
        googleapi.getToken({
            client_id: this.client_id,
            client_secret: this.client_secret
        }).done(function() {
            //Show the greet view if we get a valid token
            app.showGreetView();
        }).fail(function() {
            //Show the login view if we have no valid token
            app.showLoginView();
        });
    },
    showLoginView: function() {
        $('#login').show();
        $('#greet').hide();
        $('#button').hide();
    },
    showGreetView: function() {
        $('#login').hide();
        $('#greet').show();
        $('#button').show();

        alert("ok2");
        //Get the token, either from the cache
        //or by using the refresh token.
        googleapi.getToken({
            client_id: this.client_id,
            client_secret: this.client_secret
        }).then(function(data) {
            //Pass the token to the API call and return a new promise object
            return googleapi.userInfo({ access_token: data.access_token });
        }).done(function(user) {
            //Display a greeting if the API call was successful
            $('#greet h1').html('Hello !');
            var filePicker = document.getElementById('filePicker');
            filePicker.style.display = 'block';
            filePicker.onchange = uploadFile;
        }).fail(function() {
            //If getting the token fails, or the token has been
            //revoked, show the login view.
            app.showLoginView();
        });
    },
    onLoginButtonClick: function() {
        //Show the consent page
        googleapi.authorize({
            client_id: this.client_id,
            client_secret: this.client_secret,
            redirect_uri: this.redirect_uri,
            scope: this.scope
        }).done(function() {
            //Show the greet view if access is granted
            alert("ok");
            app.showGreetView();
        }).fail(function(data) {
            alert("ko");
            //Show an error message if access was denied
            $('#login p').html(data.error+"aq");
        });
    }

};

$(document).on('deviceready', function() {
    app.init();
});

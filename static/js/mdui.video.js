var qa_info = {"FHD":"全高清","LD":"流畅","SD":"标清","HD":"高清"};
var qa_sort = {"全高清": 1080,"流畅":360,"标清":540,"高清":720};
var accountId= $("#playlistBtn").attr("data-account-id");
var mode = $("#playlistBtn").attr("data-mode");
var fileId = $("#playlistBtn").attr("data-file-id");
var fileType = $("#playlistBtn").attr("data-file-type");
var fileName = $("#playlistBtn").attr("data-file-name");
var parentPath = $("#playlistBtn").attr("data-parent-path");
var path = $("#playlistBtn").attr("data-path");
var subtitle = $("#playlistBtn").attr("data-config-subtitle");
var subtitlePath = $("#playlistBtn").attr("data-config-subtitle-path");
var danmuku = $("#playlistBtn").attr("data-config-danmuku");
var danmukuPath = $("#playlistBtn").attr("data-config-danmuku-path");
var fullUrl = encodeURI(window.location.protocol + "//"+window.location.host + path);
var qas = getQas(accountId, fileId, fileType);
var art = initVideo(".artplayer-app", qas, fileName);
var inval;
initPlayList(parentPath);
function buildOriginalVideo(url, ft){
    var qas = [];
    var qa = {};
    qa["url"] = url;
    qa["html"] = "原画";
    if(ft == "m3u8"){
        qa["type"] = "hls";
    }else if (ft == "flv"){
        qa["type"] = "flv";
    }else{
        qa["type"] = "";
    }
    qas.push(qa);
    return qas;
}
function initVideo(container, qas, title){
    var vname = title.substring(0, title.lastIndexOf("."));
    var settings = [
        {
            html: '选择画质',
            width: 150,
            tooltip: qas[0].html,
            selector: qas,
            onSelect: function(item, $dom) {
                art.switchQuality(item.url, item.html);
                return item.html;
            },
        }
    ];
    if(subtitle != ""){
        var vpath =  subtitlePath + vname;
        var subtitlePlugin = {
            html: '选择字幕',
            width: 250,
            tooltip: '字幕',
            selector: [
            {
                default: true,
                html: '<span style="color:yellow">字幕 01</span>',
                url: vpath + '.' + subtitle,
            }
        ],
            onSelect: function(item, $dom) {
            art.subtitle.url = item.url;
            art.subtitle.encoding = "utf-8";
            art.subtitle.bilingual = true;
            art.subtitle.style({
                'font-size': '30px',
            });
            return item.html;
        },
        };
        settings.push(subtitlePlugin);
    }
    var plugins = [];
    if(danmuku != ""){
        var danmukuPath = subtitlePath + vname + ".xml";
        var danmukuPlugin = {
            html: '弹幕',
            width: 250,
            selector: [
                {
                    default: true,
                    html: '<span style="color:green">显示</span>',
                    status: 1,
                },
                {
                    default: false,
                    html: '<span style="color:red">隐藏</span>',
                    status: 0,
                }
            ],
            onSelect: function(item, $dom) {
                if(item.status == 0){
                    art.plugins.artplayerPluginDanmuku.hide();
                }else{
                    art.plugins.artplayerPluginDanmuku.show();
                }
                return item.html;
            }
        };
        settings.push(danmukuPlugin);
        plugins.push(artplayerPluginDanmuku({
            danmuku: danmukuPath,
            speed: 5,
            maxlength: 50,
            margin: [10, 100],
            opacity: 1,
            fontSize: 25,
            synchronousPlayback: false,
        }));
    }
    var currentUrl = encodeURI(window.location.protocol + "//"+window.location.host + parentPath + "/" +title);
    if(parentPath.charAt(parentPath.length-1) == "/"){
        currentUrl =encodeURI(window.location.protocol + "//"+window.location.host + parentPath + title);
    }
    var id = md5(currentUrl);
    if(qas.length > 0){
        $(".artplayer-app").css('height', $('.mdui-video-container').innerHeight());
        var art = new Artplayer({
            title: title,
            container: container,
            url: qas[0].url,
            playsInline: true,
            customType: {
                flv: function (video, url) {
                    const flvPlayer = flvjs.createPlayer({
                        type: 'flv',
                        url: url,
                    });
                    flvPlayer.attachMediaElement(video);
                    flvPlayer.load();
                },
                m3u8: function (video, url) {
                    var hls = new Hls();
                    hls.loadSource(url);
                    hls.attachMedia(video);
                    hls.on(Hls.Events.ERROR, function (event, data) {
                       switch (data.type) {
                            case Hls.ErrorTypes.NETWORK_ERROR:
                                if(mode == "aliyundrive" && $("#transcodeBtn").text()=="cloud_done"){
                                    const lastTime = art.currentTime;
                                    var qas = buildTranscodeInfo(accountId, fileId);
                                    hls.destroy();
                                    art.switchQuality(qas[0].url);
                                    art.once('video:canplay', () => {
                                        art.seek = lastTime;
                                    });
                                }
                                break;
                            case Hls.ErrorTypes.MEDIA_ERROR:
                                hls.recoverMediaError();
                                break;
                            default:
                                hls.destroy();
                                break;
                        }
                    });
                },
            },
            //quality: qas,
            autoSize: true,
            fullscreen: true,
            fullscreenWeb: false,
            //pip: true,
            autoplay: false,
            autoSize: true,
            playbackRate: true,
            aspectRatio: true,
            //screenshot: true,
            setting: true,
            miniProgressBar: true,
            theme: '#23ade5',
            settings: settings,
            whitelist: ['*'],
            plugins: plugins
        });
       art.on('video:play', (...args) => {
            var cur = getCurrentTime(id);
            if (cur){
                art.seek = cur;
            }
            autoUpdateCurrentTime(art, id);
        });
        art.on('play', (...args) => {
            //set play history
            var cur = getCurrentTime(id);
            removeVideo(id);
            var play_history_list = localStorage.getItem('play_history_list');
            var play_history_list_arr = [];
            if(play_history_list && play_history_list != null && play_history_list != ""){
                play_history_list_arr = JSON.parse(play_history_list);
            }
            var video = {};
            video.url = currentUrl;
            video.title = title;
            if(cur){
                video.currentTime = cur;
            }else{
                video.currentTime = art.currentTime;
            }
            video.id = md5(video.url);
            play_history_list_arr.unshift(video);
            localStorage.setItem('play_history_list', JSON.stringify(play_history_list_arr));
        });
        art.on('seek', (...args) => {
            updateVideoTime(art.currentTime, id);
        });
        art.on('pause', (...args) => {
            updateVideoTime(art.currentTime, id);
        });
        art.on('destroy', (...args) => {
            updateVideoTime(art.currentTime, id);
        });
        art.on('video:ended', (...args) => {
            removeVideo(id);
        });
        return art;
    }
}
$(document).ready(function() {
    var inst = new mdui.Menu('#playlistBtn', '#playlist_menu');
    $('#playlistBtn').on('click', function (ev) {
        if(ev.target.textContent == "cloud" || ev.target.textContent == "cloud_done"){
            inst.close();
        }
    });
    document.getElementById('playlist_menu').addEventListener('open.mdui.menu', function () {
        $("#playlist_menu").attr("style", "width:40%;max-height: 500px;overflow:scroll");
    });
    $("#transcodeBtn").click(function(ev){
        if(ev.target.textContent != "cloud" && ev.target.textContent != "cloud_done") return;
        var status = $(this).text();
        if(status == "cloud"){
            $(this).text("cloud_done");
            Cookies.set("transcode", "1", {expires : 3650, path:"/"});
            var qas = buildTranscodeInfo(accountId, fileId);
            art.destroy();
            art = initVideo(".artplayer-app", qas, fileName);
        }else{
            $(this).text("cloud");
            Cookies.set("transcode", "0", {expires : 3650, path:"/"});
            var qas = buildOriginalVideo(fullUrl, fileType);
            art.destroy();
            art = initVideo(".artplayer-app", qas, fileName);
        }
    });
});
function initPlayList(parentPath) {
    var formData = new FormData();
    formData.append("path", parentPath);
    formData.append("viewType", "video");
    formData.append("sortColumn", Cookies.get("sort_column"));
    formData.append("sortOrder", Cookies.get("sort_order"));
    $.ajax({
        method: 'POST',
        url: "/api/v3/public/files", //上传文件的请求路径必须是绝对路劲
        data: formData,
        cache: false,
        contentType: false,
        processData: false,
        success: function (data) {
            var pl = data.data;
            if(pl == null){
                return;
            }
            pl.sort(function(a, b){
                return String.naturalCompare(a.file_name, b.file_name);
            })
            $("#playlist_menu").empty();
            $.each(pl, function (i, item){
                var active = "";
                var activeStatus = "<i class=\"playing mdui-menu-item-icon mdui-icon material-icons\"></i>";
                if(item.path == path){
                    active = "playlist-active";
                    activeStatus = '<i class="playing mdui-menu-item-icon mdui-icon material-icons">play_circle_outline</i>';
                }
                var n = item.file_name.substring(0, item.file_name.lastIndexOf("."));
                var li = '<li id="'+md5(item.path)+'" class="mdui-menu-item '+active+'">'+
                    '  <a href="javascript:chgVideo(\''+item.file_id+'\', \''+item.path+'\', \''+item.file_name+'\', \''+item.file_type+'\');" data-type="'+item.file_type+'" data-name="'+item.file_name+'" data-path="'+item.path+'" class="mdui-ripple">'+
                    activeStatus+n+
                    '  </a>'+
                    '</li>';
                $("#playlist_menu").append(li);
            });
        }
    });
}
function chgVideo(fid, p, name, type) {
    if(inval){
        clearInterval(inval);
    }
    fileId = fid;
    fileName = name;
    fileType = type;
    path = p;
    fullUrl = encodeURI(window.location.protocol + "//"+window.location.host + path);
    var qas = getQas(accountId, fileId, fileType);
    art.destroy();
    art = initVideo(".artplayer-app", qas, fileName);
    $(".titleBtn").each(function (i, item){
        if($(this).hasClass("mdui-hidden-md-up")){
            var fn = fileName.substring(0, fileName.lastIndexOf("."))
            if(fn.length > 20){
                var t = fn.substring(0, 20);
                t = t + '...';
                $(this).text(t);
            }
        }else{
            $(this).text(fileName.substring(0, fileName.lastIndexOf(".")));
        }
        console.log($(this).attr("class"));
    });
    $("li").removeClass("playlist-active");
    $(".playing").text("");
    $("#"+md5(path)).find("i").text("play_circle_outline");
    $("#"+md5(path)).addClass("playlist-active");
}
function buildTranscodeInfo(accountId, fileId){
    var qas = [];
    $.ajax({
        method: 'POST',
        async: false,
        url: '/api/v3/public/transcode?accountId='+accountId+'&fileId='+fileId,
        success: function (data) {
            var d = JSON.parse(data);
            if(d.video_preview_play_info){
                $.each(d.video_preview_play_info.live_transcoding_task_list, function(i, item){
                    if(item.status == "finished"){
                        var qa = {};
                        qa["url"] = item.url;
                        qa["html"] = qa_info[item.template_id];
                        qa["type"] = "hls";
                        qas.push(qa);
                    }
                });
                qas = qas.sort(function(s, t){
                    var a = qa_sort[s["html"]];
                    var b = qa_sort[t["html"]];
                    if (a < b) return 1;
                    if (a > b) return -1;
                    return 0;
                });
            }else{
                mdui.snackbar({
                    message: "转码失败，正在为您转换原始地址..."
                });
            }
        }
    });
    return qas;
}
function getQas() {
    var qas = [];
    if(mode == "aliyundrive" && Cookies.get("transcode") == "1"){
        qas = buildTranscodeInfo(accountId, fileId);
        $("#transcodeBtn").text("cloud_done");
        if(qas.length == 0){
            qas = buildOriginalVideo(fullUrl, fileType);
        }
    }else{
        qas = buildOriginalVideo(fullUrl, fileType);
    }
    return qas;
}

function updateVideoTime(currentTime, id){
    var play_history_list = localStorage.getItem('play_history_list');
    if(play_history_list && play_history_list != null && play_history_list != ""){
        var play_history_list_arr = JSON.parse(play_history_list);
        $.each(play_history_list_arr, function (i, item){
            if (item.id == id){
                item.currentTime = currentTime;
            }
        });
        localStorage.setItem('play_history_list', JSON.stringify(play_history_list_arr));
    }
}

function removeVideo(id){
    var play_history_list = localStorage.getItem('play_history_list');
    if(play_history_list && play_history_list != null && play_history_list != ""){
        var index = -1;
        var play_history_list_arr = JSON.parse(play_history_list);
        $.each(play_history_list_arr, function (i, item){
            if (item.id == id){
                index = i;
            }
        });
        if(index >= 0){
            play_history_list_arr.splice(index, 1);
        }
        if(play_history_list_arr.length > 5){
            for (let i = 5; i < play_history_list_arr.length; i++) {
                play_history_list_arr.splice(i, 1);
            }
        }
        localStorage.setItem('play_history_list', JSON.stringify(play_history_list_arr));
    }
}

function getCurrentTime(id){
    var cur = 0;
    var play_history_list = localStorage.getItem('play_history_list');
    if(play_history_list && play_history_list != null && play_history_list != ""){
        var play_history_list_arr = JSON.parse(play_history_list);
        $.each(play_history_list_arr, function (i, item){
            if (item.id == id){
                cur = item.currentTime;
            }
        });
        return cur;
    }
}

function autoUpdateCurrentTime(art, id) {
   inval = setInterval(function(){
       updateVideoTime(art.currentTime, id);
    }, 5000);
}
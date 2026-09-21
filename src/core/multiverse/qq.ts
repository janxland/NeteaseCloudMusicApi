/* eslint-disable no-use-before-define */
// 浏览器扩展全局。get_user / logout 不在 api_map 里，Node 侧不可达；
// declare 不产出运行时代码，行为与旧 util/qq.js 完全一致
// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare const cookieGet: any
// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare const cookieRemove: any
/* global getParameterByName cookieGet cookieRemove */
// eslint-disable-next-line no-unused-vars
import { axios, getParameterByName, changeUrlQuery } from './base'

export class qq {
  static api_map = {
    "/search" : qq.search,
    "/playlist/detail": qq.qq_get_playlist,
    "/top/playlist": qq.qq_show_toplist,
    "/related/playlist":qq.show_playlist,
    "/song/detail": qq.get_song_detail,
    "/song/url/v1": qq.get_mp3_url,
    "/song/url": qq.get_mp3_url,
    "/lyric": qq.lyric,
  }
  static htmlDecode(value) {
    // const parser = new DOMParser();
    return value;
  }
  static get_mp3_url(url){
    let idStr = getParameterByName('id', url) || '';
    let ids = idStr.split(",");
    let ids_c = [];
    ids.forEach(element => {
      ids_c.push({url:`https://api.injahow.cn/meting/?type=url&id=${element}&server=tencent`});
    });
    return {
      success: (fn) => {
          return fn({
            code:200,
            data:ids_c
          })
      },
    };
  }
  static qq_show_toplist(offset) {
    if (offset !== undefined && offset > 0) {
      return {
        success: (fn) => fn({ result: [] }),
      };
    }
    const url =
      'https://c.y.qq.com/v8/fcg-bin/fcg_myqq_toplist.fcg?g_tk=5381&inCharset=utf-8&outCharset=utf-8&notice=0&format=json&uin=0&needNewCode=1&platform=h5';
    return {
      success: (fn) => {
        axios.get(url).then((response) => {
          const result = [];
          response.data.data.topList.forEach((item) => {
            const playlist = {
              cover_img_url: item.picUrl,
              id: `${item.id}`,
              source_url: `https://y.qq.com/n/yqq/toplist/${item.id}.html`,
              title: item.topTitle,
            };
            result.push(playlist);
          });
          return fn({ result });
        });
      },
    };
  }

  static show_playlist(url) {
    const offset = Number(getParameterByName('offset', url)) || 0;
    let filterId = getParameterByName('id', url) || '';
    if (filterId === 'toplist') {
      return qq.qq_show_toplist(offset);
    }
    if (filterId === '') {
      filterId = '10000000';
    }
    const target_url =
      'https://c.y.qq.com/splcloud/fcgi-bin/fcg_get_diss_by_tag.fcg' +
      `?picmid=1&rnd=${Math.random()}&g_tk=5381` +
      '&loginUin=0&hostUin=0&format=json&inCharset=utf8&outCharset=utf-8' +
      '&notice=0&platform=yqq.json&needNewCode=0' +
      `&categoryId=${filterId}&sortId=5&sin=${offset}&ein=${29 + offset}`;
    return {
      success: (fn) => {
        axios.get(target_url,{
          headers:{
            referer: "https://y.qq.com/",
            host: "y.qq.com"
          }
        }).then((response) => {
          const { data } = response;
          let playlists = data;
          try {
            playlists = data.data.list.map((item) => ({
              cover_img_url: item.imgurl,
              title: qq.htmlDecode(item.dissname),
              id: `${item.dissid}`,
              source_url: `https://y.qq.com/n/ryqq/playlist/${item.dissid}`,
            }));
          } catch (error) {
            
          }
          return fn({
            playlists,
          });
        });
      },
    };
  }

  static qq_get_image_url(qqimgid, img_type) {
    if (qqimgid == null) {
      return '';
    }
    let category = '';
    if (img_type === 'artist') {
      category = 'T001R300x300M000';
    }
    if (img_type === 'album') {
      category = 'T002R300x300M000';
    }
    const s = category + qqimgid;
    const url = `https://y.gtimg.cn/music/photo_new/${s}.jpg`;
    return url;
  }

  static qq_is_playable(song) {
    const switch_flag = song.switch.toString(2).split('');
    switch_flag.pop();
    switch_flag.reverse();
    // flag switch table meaning:
    // ["play_lq", "play_hq", "play_sq", "down_lq", "down_hq", "down_sq", "soso",
    //  "fav", "share", "bgm", "ring", "sing", "radio", "try", "give"]
    const play_flag = switch_flag[0];
    const try_flag = switch_flag[13];
    return play_flag === '1' || (play_flag === '1' && try_flag === '1');
  }

  static qq_convert_song(song) {
    const d = {
      ...song,
      id: song.songmid,
      name: song.songname,
      dt: song.interval * 1000,
      ar: song.singer,
      playable: song.pay.payplay == 0? 1 : 0,
      al: {name:song.albumname,picUrl:qq.qq_get_image_url(song.albummid, 'album')},
      picUrl: qq.qq_get_image_url(song.albummid, 'album'),
      source: 'tencent',
      sourceUrl: `https://y.qq.com/#type=song&mid=${song.songmid}&tpl=yqq_song_detail`,
      url: `https://api.injahow.cn/meting/?type=url&id=${song.songmid}&server=tencent`,
    };
    return d;
  }

  static qq_convert_song2(song) {
    const d = {
      id: song.mid,
      name: song.name,
      fee:8,
      playable: song.pay.pay_play == 0? 1 : 0,
      dt: song.interval * 1000,
      ar: song.singer,
      al: { ...song.album,picUrl: qq.qq_get_image_url(song.album.mid, 'album') },
      source: 'tencent',
      sourceUrl: `https://y.qq.com/#type=song&mid=${song.mid}&tpl=yqq_song_detail`,
      url: `https://api.injahow.cn/meting/?type=url&id=${song.mid}&server=tencent`,
    };
    return d;
  }

  static get_toplist_url(id, period, limit) {
    return `https://u.y.qq.com/cgi-bin/musicu.fcg?format=json&inCharset=utf8&outCharset=utf-8&platform=yqq.json&needNewCode=0&data=${encodeURIComponent(
      JSON.stringify({
        comm: {
          cv: 1602,
          ct: 20,
        },
        toplist: {
          module: 'musicToplist.ToplistInfoServer',
          method: 'GetDetail',
          param: {
            topid: id,
            num: limit,
            period,
          },
        },
      })
    )}`;
  }

  static get_periods(topid) {
    const periodUrl = 'https://c.y.qq.com/node/pc/wk_v15/top.html';
    const regExps = {
      periodList:
        /<i class="play_cover__btn c_tx_link js_icon_play" data-listkey=".+?" data-listname=".+?" data-tid=".+?" data-date=".+?" .+?<\/i>/g,
      period:
        /data-listname="(.+?)" data-tid=".*?\/(.+?)" data-date="(.+?)" .+?<\/i>/,
    };
    const periods = {};
    return axios.get(periodUrl).then((response) => {
      const html = response.data;
      const pl = html.match(regExps.periodList);
      if (!pl) return Promise.reject();
      pl.forEach((p) => {
        const pr = p.match(regExps.period);
        if (!pr) return;
        periods[pr[2]] = {
          name: pr[1],
          id: pr[2],
          period: pr[3],
        };
      });
      const info = periods[topid];
      return info && info.period;
    });
  }

  static qq_toplist(url) {
    // special thanks to lx-music-desktop solution
    // https://github.com/lyswhut/lx-music-desktop/blob/24521bf50d80512a44048596639052e3194b2bf1/src/renderer/utils/music/tx/leaderboard.js

    const list_id = Number(getParameterByName('list_id', url).split('_').pop());

    return {
      success: (fn) => {
        qq.get_periods(list_id).then((listPeriod) => {
          const limit = 100;
          // TODO: visit all pages of toplist
          const target_url = qq.get_toplist_url(list_id, listPeriod, limit);

          axios.get(target_url).then((response) => {
            const { data } = response;
            const tracks = data.toplist.data.songInfoList.map((song) => {
              const d = {
                id: `qqtrack_${song.mid}`,
                title: qq.htmlDecode(song.name),
                artist: qq.htmlDecode(song.singer[0].name),
                artist_id: `qqartist_${song.singer[0].mid}`,
                album: qq.htmlDecode(song.album.name),
                album_id: `qqalbum_${song.album.mid}`,
                img_url: qq.qq_get_image_url(song.album.mid, 'album'),
                source: 'tencent',
                source_url: `https://y.qq.com/#type=song&mid=${song.mid}&tpl=yqq_song_detail`,
                url: `https://api.injahow.cn/meting/?type=url&id=${song.songmid}&server=tencent`,
              };
              return d;
            });
            const info = {
              cover_img_url: data.toplist.data.data.frontPicUrl,
              title: data.toplist.data.data.title,
              id: `qqtoplist_${list_id}`,
              source_url: `https://y.qq.com/n/yqq/toplist/${list_id}.html`,
            };
            return fn({
              tracks,
              info,
            });
          });
        });
      },
    };
  }

  static qq_get_playlist(url) {
    // eslint-disable-line no-unused-vars
    const list_id = getParameterByName('id', url);

    return {
      success: (fn) => {
        const target_url =
          'https://i.y.qq.com/qzone-music/fcg-bin/fcg_ucc_getcdinfo_' +
          'byids_cp.fcg?type=1&json=1&utf8=1&onlysong=0' +
          `&nosign=1&disstid=${list_id}&g_tk=5381&loginUin=0&hostUin=0` +
          '&format=json&inCharset=GB2312&outCharset=utf-8&notice=0' +
          '&platform=yqq&needNewCode=0';
        axios.get(target_url,{
          headers: {
            referer: 'https://y.qq.com/',  //源域名
            host: 'y.qq.com',
            cookie:'RK=xGnc9M51Rh; ptcz=acd74021a9ca560f56bd0d75edf5426393db4668d2bfe6036c3a74b79de6ecd1; pgv_pvid=5271477160; fqm_pvqid=c9603e80-f652-4aa9-a2ec-9d95d5296e29; ts_uid=6439155294; tvfe_boss_uuid=333270e9d8a8660e; o_cookie=983341575; pac_uid=1_983341575; euin=NKcioiv57KSk; tmeLoginType=2; eas_sid=31E6s6C2Q621A8q8K0b904A001; uin_cookie=o0983341575; ied_qq=o0983341575; ts_refer=www.bing.com/; wxunionid=; psrf_qqopenid=293135ECFA0AEEA8BC3FCCBF4429B76B; wxopenid=; psrf_qqunionid=0AE5BB0DE2F76C814F816A8B89173159; wxrefresh_token=; _clck=3879655118|1|f62|0; _qpsvr_localtk=0.72815409848458; fqm_sessionid=91423111-8598-4f57-b8e0-a9fbc01e0c15; pgv_info=ssid=s5966393125; login_type=1; psrf_qqaccess_token=27F98A4E3FF58F3433EF34B691C49618; psrf_qqrefresh_token=0B4CF2FF87A6FC47BB5009C6E50E640F; psrf_access_token_expiresAt=1683354584; qm_keyst=Q_H_L_580pVUWdtM01OCi9bmMqnBXkbZ_LDD40lspXsadgW5P3b2HmL7ERm4w; psrf_musickey_createtime=1675578584; qqmusic_key=Q_H_L_580pVUWdtM01OCi9bmMqnBXkbZ_LDD40lspXsadgW5P3b2HmL7ERm4w; qm_keyst=Q_H_L_580pVUWdtM01OCi9bmMqnBXkbZ_LDD40lspXsadgW5P3b2HmL7ERm4w; ts_last=y.qq.com/n/ryqq/playlist/8532818278'
          },

        }).then((response) => {
          const { data } = response;
          // return fn({
          //   data
          // });
          const playlist = {
            ...data.cdlist[0],
            creator:{nickname: data.cdlist[0].nickname},
            picUrl: data.cdlist[0].logo,
            name: data.cdlist[0].dissname,
            id: list_id,
            description: data.cdlist[0].desc,
            sourceUrl: `https://y.qq.com/n/ryqq/playlist/${list_id}`,
            source:"tencent"
          };

          playlist.tracks = data.cdlist[0].songlist.map((item) =>
            qq.qq_convert_song(item)
          );
          return fn({
            code:200,
            playlist
          });
        });
      },
    };
  }

  static qq_album(url) {
    const album_id = getParameterByName('list_id', url).split('_').pop();

    return {
      success: (fn) => {
        const target_url =
          'https://i.y.qq.com/v8/fcg-bin/fcg_v8_album_info_cp.fcg' +
          `?platform=h5page&albummid=${album_id}&g_tk=938407465` +
          '&uin=0&format=json&inCharset=utf-8&outCharset=utf-8' +
          '&notice=0&platform=h5&needNewCode=1&_=1459961045571';
        axios.get(target_url).then((response) => {
          const { data } = response;

          const info = {
            cover_img_url: qq.qq_get_image_url(album_id, 'album'),
            title: data.data.name,
            id: `qqalbum_${album_id}`,
            source_url: `https://y.qq.com/#type=album&mid=${album_id}`,
          };

          const tracks = data.data.list.map((item) =>
            qq.qq_convert_song(item)
          );
          return fn({
            tracks,
            info,
          });
        });
      },
    };
  }

  static qq_artist(url) {
    const artist_id = getParameterByName('list_id', url).split('_').pop();

    return {
      success: (fn) => {
        const target_url = `https://u.y.qq.com/cgi-bin/musicu.fcg?format=json&loginUin=0&hostUin=0inCharset=utf8&outCharset=utf-8&platform=yqq.json&needNewCode=0&data=${encodeURIComponent(
          JSON.stringify({
            comm: {
              ct: 24,
              cv: 0,
            },
            singer: {
              method: 'get_singer_detail_info',
              param: {
                sort: 5,
                singermid: artist_id,
                sin: 0,
                num: 50,
              },
              module: 'music.web_singer_info_svr',
            },
          })
        )}`;

        axios.get(target_url).then((response) => {
          const { data } = response;

          const info = {
            cover_img_url: qq.qq_get_image_url(artist_id, 'artist'),
            title: data.singer.data.singer_info.name,
            id: `qqartist_${artist_id}`,
            source_url: `https://y.qq.com/#type=singer&mid=${artist_id}`,
          };

          const tracks = data.singer.data.songlist.map((item) =>
            qq.qq_convert_song2(item)
          );
          return fn({
            tracks,
            info,
          });
        });
      },
    };
  }
  static get_song_detail(url) {
    const ids = getParameterByName('ids', url) || '002XBgW20hvFHd';
    const target_url = 'https://u.y.qq.com/cgi-bin/musicu.fcg';
    return {
      success: (fn) => {
        const query = {
          comm: {
            ct: '19',
            cv: '1859',
            uin: '0',
          },
          req_1: {
            
              "method": "get_song_detail_yqq",
              "module": "music.pf_song_detail_svr",
              "param": {
                "song_mid": ids
              }
            
          },
        };
        axios.post(target_url,query).then((response) => {
          const { data } = response;
          let song = qq.qq_convert_song2(data.req_1.data.track_info);
          return fn({
            privileges:[{fee:song.fee}],
            songs:[song],
            code:200,
          });
        });
      },
    };
  }
  static search(url) {
    // eslint-disable-line no-unused-vars
    const keyword = getParameterByName('keywords', url);
    const curpage: any = getParameterByName('curpage', url) || 1;
    const searchType = getParameterByName('type', url) || "1";
    const limit = getParameterByName('limit', url) || 20;
    // API solution from lx-music-desktop
    // https://github.com/lyswhut/lx-music-desktop/blob/master/src/renderer/utils/music/tx/musicSearch.js
    let _map: any = {
      "0":undefined,
      "1":0, //单曲
      "10":8, //专辑
      "100":9, //歌手
      "1000":3, //歌单
    }
    const target_url = 'https://u.y.qq.com/cgi-bin/musicu.fcg';
    return {
      success: (fn) => {
        const page = curpage;
        const query = {
          comm: {
            ct: '19',
            cv: '1859',
            uin: '0',
          },
          req_1: {
            method: 'DoSearchForQQMusicDesktop',
            module: 'music.search.SearchCgiService',
            param: {
              grp: 1,
              num_per_page: limit,
              page_num: parseInt(page, 10),
              query: keyword,
              search_type: _map[searchType],
            },
          },
        };
        axios.post(target_url, query).then((response) => {
          const { data } = response;
          let result: any = {};
          let total = 0;
          // return fn({
          //   result,
          // });
          //搜索类型 默认为 0 // 0：单曲，2：歌单，7：歌词，8：专辑，9：歌手，12：mv
          if (searchType == '1') { //1: 单曲, 10: 专辑, 100: 歌手, 1000: 歌单, 1002: 用户, 1004: MV, 1006: 歌词, 1009: 电台, 1014: 视频, 1018:综合, 2000:声音
            result.songs = data.req_1.data.body.song.list.map((item) =>
              qq.qq_convert_song2(item)
            );
            total = data.req_1.data.meta.sum;
          } 
          if (searchType == '1000') {
              
            result.playlists = data.req_1.data.body.songlist.list.map((item)=>{
              return {
                ...item,
                id:item.dissid,
                picUrl:item.imgurl,
                sourceUrl: `https://y.qq.com/n/ryqq/playlist/${item.dissid}`,
                name: item.dissname,
              }
            });
          }
          total = data.req_1.data.meta.sum;
          return fn({
            result,
            total,
            code:200,
            type: searchType,
          });
        });
      },
    };
  }

  static UnicodeToAscii(str) {
    const result = str.replace(/&#(\d+);/g, () =>
      // eslint-disable-next-line prefer-rest-params
      String.fromCharCode(arguments[1])
    );
    return result;
  }

  // eslint-disable-next-line no-unused-vars
  static bootstrap_track(track, success, failure) {
    const sound: any = {};
    const songId = track.id.slice('qqtrack_'.length);
    const target_url = 'https://u.y.qq.com/cgi-bin/musicu.fcg';
    // thanks to https://github.com/Rain120/qq-music-api/blob/2b9cb811934888a532545fbd0bf4e4ab2aea5dbe/routers/context/getMusicPlay.js
    const guid = '10000';
    const songmidList = [songId];
    const uin = '0';

    const fileType = '320';
    const fileConfig = {
      m4a: {
        s: 'C400',
        e: '.m4a',
        bitrate: 'M4A',
      },
      128: {
        s: 'M500',
        e: '.mp3',
        bitrate: '128kbps',
      },
      320: {
        s: 'M800',
        e: '.mp3',
        bitrate: '320kbps',
      },
      ape: {
        s: 'A000',
        e: '.ape',
        bitrate: 'APE',
      },
      flac: {
        s: 'F000',
        e: '.flac',
        bitrate: 'FLAC',
      },
    };
    const fileInfo = fileConfig[fileType];
    const file =
      songmidList.length === 1 &&
      `${fileInfo.s}${songId}${songId}${fileInfo.e}`;

    const reqData = {
      req_0: {
        module: 'vkey.GetVkeyServer',
        method: 'CgiGetVkey',
        param: {
          filename: file ? [file] : [],
          guid,
          songmid: songmidList,
          songtype: [0],
          uin,
          loginflag: 1,
          platform: '20',
        },
      },
      loginUin: uin,
      comm: {
        uin,
        format: 'json',
        ct: 24,
        cv: 0,
      },
    };
    const params = {
      format: 'json',
      data: JSON.stringify(reqData),
    };
    axios.get(target_url, { params }).then((response) => {
      const { data } = response;
      const { purl } = data.req_0.data.midurlinfo[0];

      if (purl === '') {
        // vip
        failure(sound);
        return;
      }
      const url = data.req_0.data.sip[0] + purl;
      sound.url = url;
      const prefix = purl.slice(0, 4);
      const found = Object.values(fileConfig).filter((i) => i.s === prefix);
      sound.bitrate = found.length > 0 ? found[0].bitrate : '';
      sound.platform = 'qq';

      success(sound);
    });
  }

  // eslint-disable-next-line no-unused-vars
  static str2ab(str) {
    // string to array buffer.
    const buf = new ArrayBuffer(str.length);
    const bufView = new Uint8Array(buf);
    for (let i = 0, strLen = str.length; i < strLen; i += 1) {
      bufView[i] = str.charCodeAt(i);
    }
    return buf;
  }

  static lyric(url) {
    // eslint-disable-line no-unused-vars
    const track_id = getParameterByName('id', url).split('_').pop();
    // use chrome extension to modify referer.
    const target_url =
      'https://i.y.qq.com/lyric/fcgi-bin/fcg_query_lyric_new.fcg?' +
      `songmid=${track_id}&g_tk=5381&format=json&inCharset=utf8&outCharset=utf-8&nobase64=1`;
    return {
      success: (fn) => {
        axios.get(target_url,{
          headers:{
            referer:'https://c.y.qq.com/',
            host:'c.y.qq.com'
          }
        }).then((response) => {
          const { data } = response;
          const lrc = data.lyric || '';
          const tlrc = data.trans || '';
          return fn({
            code: 200,
            lrc:{ lyric: lrc },
            tlyric: { lyric: tlrc },
          });
        });
      },
    };
  }

  static parse_url(url) {
    return {
      success: (fn) => {
        let result;

        let match = /\/\/y.qq.com\/n\/yqq\/playlist\/([0-9]+)/.exec(url);
        if (match != null) {
          const playlist_id = match[1];
          result = {
            type: 'playlist',
            id: `qqplaylist_${playlist_id}`,
          };
        }
        match = /\/\/y.qq.com\/n\/yqq\/playsquare\/([0-9]+)/.exec(url);
        if (match != null) {
          const playlist_id = match[1];
          result = {
            type: 'playlist',
            id: `qqplaylist_${playlist_id}`,
          };
        }
        match =
          /\/\/y.qq.com\/n\/m\/detail\/taoge\/index.html\?id=([0-9]+)/.exec(
            url
          );
        if (match != null) {
          const playlist_id = match[1];
          result = {
            type: 'playlist',
            id: `qqplaylist_${playlist_id}`,
          };
        }

        // c.y.qq.com/base/fcgi-bin/u?__=1MsbSLu
        match = /\/\/c.y.qq.com\/base\/fcgi-bin\/u\?__=([0-9a-zA-Z]+)/.exec(
          url
        );
        if (match != null) {
          return axios
            .get(url)
            .then((response) => {
              const { responseURL } = response.request;
              const playlist_id = getParameterByName('id', responseURL);
              result = {
                type: 'playlist',
                id: `qqplaylist_${playlist_id}`,
              };
              return fn(result);
            })
            .catch(() => fn(undefined));
        }
        return fn(result);
      },
    };
  }
  static get_playlist(url) {
    const list_id = getParameterByName('list_id', url).split('_')[0];
    switch (list_id) {
      case 'qqplaylist':
        return qq.qq_get_playlist(url);
      case 'qqalbum':
        return qq.qq_album(url);
      case 'qqartist':
        return qq.qq_artist(url);
      case 'qqtoplist':
        return qq.qq_toplist(url);
      default:
        return null;
    }
  }

  static get_playlist_filters() {
    const target_url =
      'https://c.y.qq.com/splcloud/fcgi-bin/fcg_get_diss_tag_conf.fcg' +
      `?picmid=1&rnd=${Math.random()}&g_tk=732560869` +
      '&loginUin=0&hostUin=0&format=json&inCharset=utf8&outCharset=utf-8' +
      '&notice=0&platform=yqq.json&needNewCode=0';

    return {
      success: (fn) => {
        axios.get(target_url).then((response) => {
          const { data } = response;
          const all = [];
          data.data.categories.forEach((cate) => {
            const result = { category: cate.categoryGroupName, filters: [] };
            if (cate.usable === 1) {
              cate.items.forEach((item) => {
                result.filters.push({
                  id: item.categoryId,
                  name: qq.htmlDecode(item.categoryName),
                });
              });
              all.push(result);
            }
          });
          const recommendLimit = 8;
          const recommend = [
            { id: '', name: '全部' },
            { id: 'toplist', name: '排行榜' },
            ...all[1].filters.slice(0, recommendLimit),
          ];

          return fn({
            recommend,
            all,
          });
        });
      },
    };
  }

  static get_user_by_uin(uin, callback) {
    const infoUrl = `https://u.y.qq.com/cgi-bin/musicu.fcg?format=json&&loginUin=${uin}&hostUin=0inCharset=utf8&outCharset=utf-8&platform=yqq.json&needNewCode=0&data=${encodeURIComponent(
      JSON.stringify({
        comm: { ct: 24, cv: 0 },
        vip: {
          module: 'userInfo.VipQueryServer',
          method: 'SRFVipQuery_V2',
          param: { uin_list: [uin] },
        },
        base: {
          module: 'userInfo.BaseUserInfoServer',
          method: 'get_user_baseinfo_v2',
          param: { vec_uin: [uin] },
        },
      })
    )}`;

    return axios.get(infoUrl).then((response) => {
      const { data } = response;
      const info = data.base.data.map_userinfo[uin];
      const result = {
        is_login: true,
        user_id: uin,
        user_name: uin,
        nickname: info.nick,
        avatar: info.headurl,
        platform: 'qq',
        data,
      };
      return callback({ status: 'success', data: result });
    });
  }

  static get_user_created_playlist(url) {
    const user_id = getParameterByName('user_id', url);
    // TODO: load more than size
    const size = 100;

    const target_url = `https://c.y.qq.com/rsc/fcgi-bin/fcg_user_created_diss?cv=4747474&ct=24&format=json&inCharset=utf-8&outCharset=utf-8&notice=0&platform=yqq.json&needNewCode=1&uin=${user_id}&hostuin=${user_id}&sin=0&size=${size}`;

    return {
      success: (fn) => {
        axios.get(target_url).then((response) => {
          const playlists = [];
          response.data.data.disslist.forEach((item) => {
            let playlist = {};
            if (item.dir_show === 0) {
              if (item.tid === 0) {
                return;
              }
              if (item.diss_name === '我喜欢') {
                playlist = {
                  cover_img_url:
                    'https://y.gtimg.cn/mediastyle/y/img/cover_love_300.jpg',
                  id: `qqplaylist_${item.tid}`,
                  source_url: `https://y.qq.com/n/ryqq/playlist/${item.tid}`,
                  title: item.diss_name,
                };
                playlists.push(playlist);
              }
            } else {
              playlist = {
                cover_img_url: item.diss_cover,
                id: `qqplaylist_${item.tid}`,
                source_url: `https://y.qq.com/n/ryqq/playlist/${item.tid}`,
                title: item.diss_name,
              };
              playlists.push(playlist);
            }
          });
          return fn({
            status: 'success',
            data: {
              playlists,
            },
          });
        });
      },
    };
  }

  static get_user_favorite_playlist(url) {
    const user_id = getParameterByName('user_id', url);
    // TODO: load more than size
    const size = 100;
    // https://github.com/jsososo/QQMusicApi/blob/master/routes/user.js
    const target_url = `https://c.y.qq.com/fav/fcgi-bin/fcg_get_profile_order_asset.fcg`;
    const data = {
      ct: 20,
      cid: 205360956,
      userid: user_id,
      reqtype: 3,
      sin: 0,
      ein: size,
    };
    return {
      success: (fn) => {
        axios.get(target_url, { params: data }).then((response) => {
          const playlists = [];
          response.data.data.cdlist.forEach((item) => {
            let playlist = {};
            if (item.dir_show === 0) {
              return;
            }
            playlist = {
              cover_img_url: item.logo,
              id: `qqplaylist_${item.dissid}`,
              source_url: `https://y.qq.com/n/ryqq/playlist/${item.dissid}`,
              title: item.dissname,
            };
            playlists.push(playlist);
          });
          return fn({
            status: 'success',
            data: {
              playlists,
            },
          });
        });
      },
    };
  }

  static get_recommend_playlist() {
    const target_url = `https://u.y.qq.com/cgi-bin/musicu.fcg?format=json&&loginUin=0&hostUin=0inCharset=utf8&outCharset=utf-8&platform=yqq.json&needNewCode=0&data=${encodeURIComponent(
      JSON.stringify({
        comm: {
          ct: 24,
        },
        recomPlaylist: {
          method: 'get_hot_recommend',
          param: {
            async: 1,
            cmd: 2,
          },
          module: 'playlist.HotRecommendServer',
        },
      })
    )}`;

    return {
      success: (fn) => {
        axios.get(target_url).then((response) => {
          const playlists = [];
          response.data.recomPlaylist.data.v_hot.forEach((item) => {
            const playlist = {
              cover_img_url: item.cover,
              id: `qqplaylist_${item.content_id}`,
              source_url: `https://y.qq.com/n/ryqq/playlist/${item.content_id}`,
              title: item.title,
            };
            playlists.push(playlist);
          });
          return fn({
            status: 'success',
            data: {
              playlists,
            },
          });
        });
      },
    };
  }

  static get_user() {
    return {
      success: (fn) => {
        const domain = 'https://y.qq.com';
        cookieGet(
          {
            url: domain,
            name: 'uin',
          },
          (qqCookie) => {
            if (qqCookie === null) {
              return cookieGet(
                {
                  url: domain,
                  name: 'wxuin',
                },
                (wxCookie) => {
                  if (wxCookie == null) {
                    return fn({ status: 'fail', data: {} });
                  }
                  let { value: uin } = wxCookie;
                  uin = `1${uin.slice('o'.length)}`; // replace prefix o with 1
                  return qq.get_user_by_uin(uin, fn);
                }
              );
            }
            const { value: uin } = qqCookie;
            return qq.get_user_by_uin(uin, fn);
          }
        );
      },
    };
  }

  static get_login_url() {
    return `https://y.qq.com/portal/profile.html`;
  }

  static logout() {
    cookieRemove(
      {
        url: 'https://y.qq.com',
        name: 'uin',
      },
      () => {
        cookieRemove(
          {
            url: 'https://y.qq.com',
            name: 'wxuin',
          },
          () => {}
        );
      }
    );
  }
}
export default qq

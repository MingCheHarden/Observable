import Rx from 'rxjs';
import NEWAPTools from "common/scripts/utils/tools";
import jsonp from 'utils/http/jsonp';
import ADTools from "libs/AD/article";

let newsListData = [];
let ADData = {};
let offset = 0;
let size = 10;
let channel = "0005";
let child = "all";

function _getHomeFlowListRequestUrl({
    isFirstPage,
    size,
    channel,
    child,
    offset,
    docTpl = `${location.origin}/<#=channel#>/article/<#=docid#>.html`
}) {
    let url = `newap_article_list?offset=${offset}&size=${size}&channel=${channel}&child=${child}&docid=${docTpl}`;
    //&docid=${location.origin + location.pathname}
    if (isFirstPage) {
        return `${url}&firstPage=1`;
    } else {
        return url;
    }
}

function createNewsResponse({
    offset = 0,
    isFirstPage = false,
    size,
    channel,
    child
}) {
    let url = _getHomeFlowListRequestUrl({
        isFirstPage,
        offset,
        size,
        channel,
        child
    });
    return Rx.Observable.create((observer) => {
        NEWAPTools.publicMethod.fetchdata({
            url,
            abort: true,
            useflag: false
        }, (flowdata) => {
            observer.next(flowdata);
        });
    });
};

function arrToObj(arr, key) {
    var obj = {},
        i = 0,
        j = arr.length;
    for (; i < j; i++) {
        if (arr[i][key]) {
            obj[arr[i][key]] = arr[i];
        }
    }
    return obj;
}

function combineAddData(newsData, ADData) {
    let tmp = $.extend(true, [], newsData);
    let ADobj = arrToObj(ADData, 'adposition');
    let startIndex = newsListData.length;
    let endIndex = newsListData.length + newsData.length;
    // for (var key in ADobj) {
    //     if (ADobj.hasOwnProperty(key)) {
    //         var element = ADobj[key];
    //         if (key > start && key < end) {
    //             tmp.splice(key - start, 0, element);
    //         }

    //     }
    // }
    $.each(ADobj, function(key, item) {
        var adIndex = parseInt(key) - 1,
            pushIndex;
        if (adIndex >= startIndex && adIndex <= startIndex + tmp.length) {
            pushIndex = startIndex == 0 ? adIndex : adIndex - startIndex;
            tmp.splice(pushIndex, 0, item);
        }
    });

    return tmp;
};

function updateADData(newData) {
    $.extend(true, ADData, newData);
}

let obYiTouADResponse = Rx.Observable
    .fromPromise(fetch("/wap/special/0040ad/wap_ad_article.js")
        .then((response) => {
            return response.json();
        }))
    .publishReplay(1)
    .refCount();
let obCooperADResponse = Rx.Observable
    .fromPromise(jsonp("http://3g.163.com/ntes/special/003419PL/article_list_papa.html", { cbName: "otherad_callback" }));


let obADBigList = Rx.Observable
    .combineLatest(obYiTouADResponse, obCooperADResponse, (yitouADData, cooperADData) => {
        //大列表数据整合
        let yitouADDataTmp = $.extend(true, {}, yitouADData);
        let cooperADDataTmp = ADTools.cooperADConversion(cooperADData);
        delete yitouADDataTmp['new'];
        return ADTools.remixADData(yitouADDataTmp, cooperADDataTmp);
    })
    .do((data) => {
        ADData = data;
    })
    .publishReplay(1)
    .refCount();

//第一步初始化信息流
let obStartNewsResponse = createNewsResponse({
        offset,
        size,
        channel,
        child
    })
    .do(() => {
        offset += size;
    });
let obInit = Rx.Observable
    .combineLatest(obStartNewsResponse, obADBigList, (newsData, ADData) => {
        return combineAddData(newsData.listdata.data, ADData.list);
    })
    .do((data) => {
        console.log(`Init:${data}`);
        newsListData.push(data);
    });
obInit.subscribe();
//易投详细数据
let obYiTouDetail = obYiTouADResponse
    .flatMap((yiTouListData) => {
        return Rx.Observable
            .fromPromise(
                ADTools.getYiTouDetailADData({
                    ADdata: yiTouListData,
                    cbName: "ad_info",
                    requestType: "jsonp"
                }));
    })
    .publishReplay(1)
    .refCount()
    .do((YiTouDetailData) => {
        console.log(ADData);
        //把ADData中的易投站位数据更新了
        updateADData(YiTouDetailData);
    });
obYiTouDetail.subscribe();
//监听scrollAtbottom，加载更多信息
let obScrollAtBottom = Rx.Observable.fromEvent(window, "scroll")
    .filter(() => {
        var scrollTop = window.pageYOffset,
            winHeight = window.innerHeight,
            docHeight = document.documentElement.scrollHeight;
        if (docHeight - winHeight <= scrollTop + 80) {
            return true;
        }
        return false;
    });
let obAddMoreNewsResponse = obScrollAtBottom.flatMap(() => {
    return createNewsResponse({
            offset,
            size,
            channel,
            child
        })
        .do(() => {
            offset += size;
        });
});
let obADStream = obADBigList.flatMap((ADBigList) => {
    return obYiTouDetail
        .map((YiTouDetail) => {
            return $.extend(true, ADBigList, YiTouDetail);
        });
});
let obAddMoreNews = obAddMoreNewsResponse
    .withLatestFrom(obADStream, (newsData, ADData) => {
        return combineAddData(newsData.listdata.data, ADData);
    })
    .do((data) => {
        console.log(data);
        newsListData.concat(data);
    });

obAddMoreNews.subscribe();
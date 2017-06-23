// 支持多条数据流
//1 largeADRequstStream  : rq------------------------------------------------------->
//2 responseStream       : ---rp---------------------------------------------------->

//3 yitouDetailADRequest : -------rq------------------------------------------------>
//4 responseStream       : -----------rp-------------------------------------------->

//7 ADresponseStream     : ----2------4--------------------------------------------->

//8 scrollAtBottomStream : -------------------s----------------s------------------>
//9 newsrequestStream    : rq-----------------rq---------------rq------------------>
//10 responseStream      : ---rp------------------rp---------------rp------------------>

// flowStream            : ----7+10---7+10--------7+10-------------7+10------------>

// data -> view
// view匹配mvvm 是真心好使啊

let state = [];
var $yiTouADFirstRsp = Rx.Observable.fromPromise(fetch("XXX").then((response) => {
    return response.json();
}));

$flowStream
    .combineLast((newsLists) => {

    });
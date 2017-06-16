//1 largeADRequstStream  : rq------------------------------------------------------->
//2 responseStream       : ---rp---------------------------------------------------->
// cooperAD放到第三步一起去请求
//3 DetailADRequest      : -------rq------------------------------------------------>
//4 responseStream       : -----------rp-------------------------------------------->

//7 ADresponseStream     : ----2------4--------------------------------------------->

//8 scrollAtBottomStream : -------------------s----------------s------------------>
//9 newsrequestStream    : rq-----------------rq---------------rq------------------>
//10 responseStream      : ---rp------------------rp---------------rp------------------>

// flowStream            : ----7+10---7+10--------7+10-------------7+10------------>

//1
var largeADRequstStream = Rx.Observable.just("/wap/special/0040ad/wap_ad_article.js");
//2
var largeADResponseStream = largeADRequstStream.flatMap(requestUrl => Rx.Observable.fromPromise(fetch(requestUrl)));
//3
var detailADRequestStream = largeADResponseStream.flatMap((largeADListData) => {
    let promisesArray = format(largeADListData); //+cooperADrequest
    return {
        noMoreRequestData,
        promisesArray
    };
});
//4
var detailADResponseStream = detailADRequestStream.flatMap(({ noMoreRequestData, promisesArray }) => {
    return Rx.Observable.create(observer => {
        observer.next(Promise.all(promisesArray));
    })
})

//7 
var ADresponseStream = Rx.Observable
    .merge(largeADResponseStream, detailADResponseStream)
    .publishReplay(1)
    .refCount();

//8

//9
var newListResponseStream;
//10
var flowStream = newListResponseStream
    .combineLatest(ADresponseStream, (x, R) => {

    });

flowStream.subscribe((data) => {

});
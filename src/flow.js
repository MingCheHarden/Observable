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
    .do((ADData) => {
        count++;
    })
    .publishReplay(1)
    .refCount();

//8

//9
var newListResponseStream;
//10
var flowStream = newListResponseStream
    .combineLatest(ADresponseStream, (newList, AD) => {
        if (noChange) {
            combine(newList, AD);
        } else {
            update(newList, AD);
        }
    });

let startIndex;
flowStream.subscribe(({ ADData, newsListData }) => {
    let appendedData = combineAddintoFlowData(newsListData, ADData);
    $(wrapper).append(appendedData);
});
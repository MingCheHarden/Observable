# 流式编程思维

## 我想说啥
前端的编程思维总觉得不能让oop一家独大（(⊙﹏⊙)b），好吧，还是说实话，写不好oop，什么原型，原型链，然后继承，多态，哎...，只能说我们这半路出家入编程的人想要提升表示亚历山大。不过，最近启发我oop编程思维最大的，就是一丁主导的node_ssr（鼓掌~~）。里面的代码设计，层次，终于让我看到oop思维在编程设计上的好处。

先抛几个名词：函数式编程、响应式编程（observable）。

再造个词：响应式函数编程。

再加个前端库：Rxjs

来开始解读。

## 官方介绍+个人解读
### 流的核心概念
http://reactivex.io/rxjs/manual/overview.html#flow

### 推vs拉
http://reactivex.io/rxjs/manual/overview.html#observable
http://reactivex.io/rxjs/manual/overview.html#pull-versus-push

## 做的一些实战
### 1. 优势一：强大的数据流整理
改造项目：蛋疼的信息流广告逻辑。

需求：
1. 信息流由新闻列表和多条来源的广告组合而成，相应的数据都有后端提供的接口。
2. 某条广告来源，简称YT，第一次获取只能获取到广告的位置信息流，广告展示的图片、链接需发二次...（此处有一句mmp）。
3. 展示方案：
<br>
（1）先展示十条新闻数据+一次请求的多源广告数据，这样没有详细广告数据的先给个默认的广告站位。
<br>
（2）等二次请求的YT广告详细数据回来，再处理占位图。
<br>
（3）支持下拉到底部加载新数据。下拉加载再第一步执行结束之后才可生效，与第二步没有先后顺序，谁先到先执行。

分析：
（1）现在的做法
```javascript
let ADData;
//初始化十条
Promise.all([
    "新闻数据url"，
    "广告数据YT",
    "广告数据cooper",
])
.then((x1,x2,x3)=>{
    //组合三条数据完成初始化
    $(container).html(init(x1,x2,x3));
    //更新公共的广告数据变量
    updateADData(x2,x3)
    //再发二次请求
    return getYTDetailADData(x2);
})
.then((newADData)=>{
    //更新那些广告站位图
    updateContainer(newADData);
    //更新公共的广告数据变量
    updateADData(newADData)
})
//这步必须

//下拉加载
listenScrollAtBottom(()=>{
    getMoreHomeNewsThenAppend()
    .then(()=>{
        //
        combine("新闻数据",ADData)
    })
});
```
这应该是前端面对整合数据最常用，最多用的思路。
嗯嗯...简化的逻辑看起来还能忍。

但说下业务中具体遇到的问题:
1. 先说下这段代码的发展吧。<br>最初一群大菜逼（包括我），认识个毛线的promise... 回调地域好么...不多说了.../(ㄒoㄒ)/~~<br>现在改成了promise，比之前不知道看着舒服了多少倍，但是思路和之前完全一致，也就是说promise就是让这段代码好看，额，promise.all也对性能提升不少。这段代码到现在也仅在我负责的页面部分promise化了，也就说我们使用的环境还有callback... 贴个现状... 
    ```JavaScript
    //请求信息流数据
    return NEWAPTools.publicMethod.fetchdata({
        "url": url,
        "abort": true,
        "useflag": false
    }, (flowData) => {
        flowData.listdata.data = this._filterHomeFlowData(flowData.listdata.data);
        offset += this.initSize;
        if (store.getState().showAD) {
            let cooperADDataTmp = {};
            let ADSource = [{
                url: ADTools.yiTouADpath,
                requestType: "json"
            }, {
                url: ADTools.cooperADurl,
                cbName: "otherad_callback",
                requestType: "jsonp"
            }];
            let promises = ADTools.getAllPromise(ADSource);
            Promise.all(promises)
                .then(([yitouADData, cooperADData]) => {
                    yitouADDat
    ```
    不想说什么，只觉得恶心，深陷业务无法自拔。
    ```JavaScript
        _createNewsOBResponse({
            isFirstPage = false,
            useflag = true
        } = {}) {
            let url = this._getHomeFlowListRequestUrl(isFirstPage);
            return Rx.Observable.create((observer) => {
                NEWAPTools.publicMethod.fetchdata({
                    url,
                    useflag
                }, (flowdata) => {
                    observer.next(flowdata);
                });
            });
        }
        //第一步初始化信息流
        let obStartNewsResponse = this._createNewsOBResponse({
                useflag: false,
                isFirstPage: true
            })
            .do(() => {
                offset += this.initSize;
            });

        let obInit = Rx.Observable
            .combineLatest(obStartNewsResponse, obADBigList, (newsData, ADData) => {
                NEWAPTools.publicMethod.generateHtml(this.$listContainer, newsData.listdata.data, ADData);
            })
            .do(() => {
                this.isInitDone = true;
                this._listItem2thAddNewsappOpen();
                store.dispatch(hideListLoading());
            });
        obInit.subscribe();
    ```
    看下observable处理这些有多清爽，它能对代码做封装，observable化，它已经不再关注你用promise合适callback，统统给你转成observable，舒服不？


2. 因多处需要二次加工、组合数据，所以都放在某个then阶段，虽然已经尽量把纯净的组合处理函数抽出来，但业务柔和在一起，又繁又重，当时还在庆幸只有两条广告流，再加一条，简直就要疯。
贴一段代码：<br>
背景：请求两条广告接口，处理组合广告数据，再和新闻数据揉到一起，做初始化的十条显示。最后再去请求YT详细数据。

    ```javascript
    Promise.all(promises)
        .then(([yitouADData, cooperADData]) => {
            yitouADDataTmp = $.extend(true, {}, yitouADData);
            cooperADDataTmp = ADTools.cooperADConversion(cooperADData);
            delete yitouADDataTmp['new'];
            let remixedADData = ADTools.remixADData(yitouADDataTmp, cooperADDataTmp);

            NEWAPTools.publicMethod.generateHtml(this.$listContainer, flowData.listdata.data, remixedADData);

            return ADTools.getYiTouDetailADData({
                ADdata: yitouADDataTmp,
                cbName: "ad_info",
                requestType: "jsonp"
            });
        })
    ```
    这一个then里面要做三件事，而且没办法拆必须链式走到底，一条道走到黑，不然你告诉我怎么控制事件流...

    先来瞅瞅observable强大的拆分组合事件流功力，怎么做这件事：
    ```javascript
    //易投的初次广告数据和换量合作广告数据拼接，先让页面显示
    let obADBigList = Rx.Observable
        .combineLatest(obYiTouADResponse, obCooperADResponse, (yitouADData, cooperADData) => {
            //大列表数据整合
            let yitouADDataTmp = Object.assign({}, yitouADData);
            let cooperADDataTmp = ADTools.cooperADConversion(cooperADData);
            delete yitouADDataTmp['new'];
            return ADTools.remixADData(yitouADDataTmp, cooperADDataTmp);
        })
        .publishReplay(1)
        .refCount();
    let obInit = Rx.Observable
        .combineLatest(obStartNewsResponse, obADBigList, (newsData, ADData) => {
            NEWAPTools.publicMethod.generateHtml(this.$listContainer, newsData.listdata.data, ADData);
        })
        .do(() => {
            this.isInitDone = true;
            this._listItem2thAddNewsappOpen();
            store.dispatch(hideListLoading());
        });
    obInit.subscribe();
    //易投详细数据 
    let obYiTouListDetail = obYiTouDetail
        .do((YiTouDetailData) => {
            ADTools.replaceListAD($('section', this.$listContainer), YiTouDetailData);
        });
    obYiTouListDetail.subscribe();
    ```
    舒服么？揉合到一起的三步逻辑全部拆分了出来obADBigList、obInit、obYiTouListDetail，通过observable对象的组合，就能单独去做某件事。

个人认为这是目前我见过最优雅的解决此类问题的方案。

此话偷自: https://www.zhihu.com/question/40035517 徐飞（民工叔）有关此类业务场景的分析回答，这篇分享大多思路都受到了他的启发。~\(≧▽≦)/~


wap\touch_article_2016\dev_branches\ob-flow\app\libs\AD\obAD.js

### 2. 优势二：梳理dom事件流
改造项目：图集轮播组件。
wap\touch_photoset_2016\branches\final\app\libs\ObservableScroll.js

需求：

1.轮播组件，作为前端，应该不陌生。监听手指或者鼠标的start、move、end的事件流，控制dom元素的移动、翻页。

以前你可能这样写：

```JavaScript
$dom.addEventListener("touchstart", function(event) {
    //初始化一些变量
});
$dom.addEventListener("touchmove", function(event) {
    //move的过程中需要不断与touchstart时记录的初始值做比较然后做相应变化
});
$dom.addEventListener("touchend", function(event) {
    //end触发
});
```
三个事件是分离的，而且每个单独的事件比如move，连续两次触发之前也是分离的，想要建立联系，必须储存公共变量或者记到dom的this中去，强行建立联系。

observable能把这些事件流抽象到一个可怕的程度。

现在你可以这么写：

```JavaScript
let obTouchMove = Rx.Observable.fromEvent(this.$wrapper, 'touchmove'),
    obTouchStart = Rx.Observable.fromEvent(this.$wrapper, 'touchstart'),
    obTouchEnd = Rx.Observable.fromEvent(this.$wrapper, 'touchend'),
    obTouchCancel = Rx.Observable.fromEvent(this.$wrapper, 'touchcancel');
let obTouchStop = Rx.Observable.merge(obTouchEnd, obTouchCancel);

//揉合touchstart touchmove touchend抽象出来的drag observable对象
//touchstart开始 touchmove的时候做变化 遇到touchend或者touchcancel停止
let obTouchDrag = obTouchStart.flatMap((ts) => {
    // ts就是touchStart Event
    return obTouchMove
        .map((tm) => {
        })
        .takeUntil(obTouchStop)
});
obTouchDrag.subscribe((height) => {
    $(".js-briefIntro").css({
        height: `${height}px`
    });
});

//根据相应的业务逻辑抽象出来的touchend observable对象
let obTouchOver = obTouchStart.flatMap((ts) => {
    //obTouchStart开始
    return obTouchMove
        .takeUntil(obTouchStop) //监控touchmove，直到遇到touchend或者touchcancel停止
        .takeLast(1) //这里取了最后一次的touchmove事件
        .map((tm) => {
            //嗯嗯... 做你想做的事吧
        })
});
obTouchOver.subscribe((height) => {
    $(".js-briefIntro").css({
        height: `${height}px`,
        "-webkit-transition-duration": "600ms"
    });
});
```
怎么样？observable对事件流的抽象能力是真的强，再比如你要根据两次touchmove间的位移和时间间隔计算出滑动速度，利用一个operator http://reactivex.io/rxjs/class/es6/Observable.js~Observable.html#instance-method-pairwise
能很轻松的得到...

## 我是怎么理解它，考虑它的，个人的一些心里路程
这么强的数据流抽象能力，搭配mvvm框架、typescript，是不是面对较复杂的单页应用，会偷偷笑出声？

快来看看这个 https://github.com/vuejs/vue-rx 

嗯嗯... 还有...

在状态管理方面的mobx。（redux...）

https://github.com/mobxjs/mobx

但学习成本...哎...

个人感觉流式编程（响应式编程），针对的就是略微复杂的场景，当你遇到复杂的事件流，链式代码写的想吐，维护起来很难受的时候，可以考虑observable，Rxjs只是这种编程思维的一种实现。

从编程思维上来看看这次的收获吧，多掌握一条思路，能避免让你在一条思路上死磕，同时感觉还能加深对oop思维的理解（一定是我出现了幻觉(⊙o⊙)），现在回头来看oop，感觉其更多优势在于设计软件的层次方面，多用继承，没毛病。

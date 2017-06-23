import { Observable, Observer } from 'rxjs'

const stream = Observable.create((observer) => {
    let i = 0
    const intervalId = setInterval(() => {
        observer.next(++i)
    }, 1000)
    return () => clearInterval(intervalId)
})

function createIntervalObservable(base) {
    let i = 0
    return Observable.create((observer) => {
        const intervalId = setInterval(() => {
            observer.next(`base: ${base}, value: ${++i}`)
        }, 200)
        return () => {
            clearInterval(intervalId)
            console.log(`unsubscribe base: ${base}`)
        }
    })
}

stream.switchMap(createIntervalObservable)
    .subscribe(result => console.log(result))

//这里的 switchMap 其实是 map and switch，而 switch 操作符的行为是：
// 如果 Observable 中流动的数据也是 Observable，
// switch 会将数据流中最新的一个 Observable 订阅并将它的值传递给下一个操作符， 然后取消订阅之前的 Observable。
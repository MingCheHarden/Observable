import { EventEmitter } from 'fbemitter';
import Rx from "rxjs";

class ObservableScroll {
    constructor(wrapper, {
        vxBound = 0.4,
        scrollElem = "li",
        duration = 600,
        // isSupportClick = true,
    } = {}) {
        this.emitter = new EventEmitter;
        this.$wrapper = document.querySelector(wrapper);
        this.vxBound = vxBound;
        this.translateX = 0;
        this.currentPageIndex = 0;
        let $scrollElem = document.querySelector(`${wrapper} ${scrollElem}`);
        let $scrollAllElem = document.querySelectorAll(`${wrapper} ${scrollElem}`);
        this.photosetWidth = $scrollElem.clientWidth;
        this.pageCount = $scrollAllElem.length;
        this.$wrapper.style.width = `${this.pageCount * $scrollElem.clientWidth}px`;
        this.duration = duration;

        this.obMouseMove = Rx.Observable.fromEvent(this.$wrapper, 'mousemove');
        this.obTouchMove = Rx.Observable.fromEvent(this.$wrapper, 'touchmove');

        this.obMouseDown = Rx.Observable.fromEvent(this.$wrapper, 'mousedown');
        this.obTouchStart = Rx.Observable.fromEvent(this.$wrapper, 'touchstart');

        this.obMouseUp = Rx.Observable.fromEvent(this.$wrapper, 'mouseup');
        this.obTouchEnd = Rx.Observable.fromEvent(this.$wrapper, 'touchend');
        this.obTouchCancel = Rx.Observable.fromEvent(this.$wrapper, 'touchcancel');

        this.init();
    }

    translate(target, x, duration = this.duration) {
        this.translateX = x;
        target.style.transform = `translate3d(${x}px,0,0)`;
        target.style.transitionDuration = `${duration}ms`
        target.style.transitionTimingFunction = `cubic-bezier(0, 0.68, 0.68, 1)`;
    }

    scrollToPage(pageIndex) {
        this.translateX = -pageIndex * this.photosetWidth;
        this.translate(this.$wrapper, this.translateX);
        this.emitter.emit("scrollEnd");
    }

    goNext() {
        if (this.currentPageIndex < this.pageCount - 1) {
            this.currentPageIndex++;
            this.scrollToPage(this.currentPageIndex);
        }
    }

    goPrev() {
        if (this.currentPageIndex > 0) {
            this.currentPageIndex--;
            this.scrollToPage(this.currentPageIndex);
        }
    }

    _triggerCustomClick(event) {
        // evt.initMouseEvent("click", canBubble, cancelable, view,
        //     detail, screenX, screenY, clientX, clientY,
        //     ctrlKey, altKey, shiftKey, metaKey,
        //     button, relatedTarget);
        let target = event.target;
        if (!/(SELECT|INPUT|TEXTAREA)/i.test(target.tagName)) {
            let mouseEvents = document.createEvent("MouseEvents");
            mouseEvents.initMouseEvent("click", !0, !0, event.view, 1, event.screenX, event.screenY, event.clientX, event.clientY, event.ctrlKey, event.altKey, event.shiftKey, event.metaKey, 0, null);
            target.dispatchEvent(mouseEvents);
        }
    }

    _end(event) {
        this.emitter.emit("beforeScrollEnd");

        if (event.vx < -this.vxBound)
            this.currentPageIndex++;
        else if (event.vx > this.vxBound)
            this.currentPageIndex--;
        else
            this.currentPageIndex = -Math.round(this.translateX / this.photosetWidth);

        if (this.currentPageIndex < 0) {
            this.currentPageIndex = 0;
        }
        if (this.currentPageIndex > this.pageCount - 1) {
            this.currentPageIndex = this.pageCount - 1;
        }
        this.scrollToPage(this.currentPageIndex);
    }

    init() {
        const obTouchStop = Rx.Observable.merge(this.obTouchEnd, this.obTouchCancel);
        this.obTouchDrag = this.obTouchStart.flatMap(ts => {
            const TSTarget = ts.targetTouches[0];
            const startX = TSTarget.pageX;
            const startY = TSTarget.pageY;
            ts.preventDefault();
            return this.obTouchMove
                .skip(1)
                .map(tm => {
                    const TMTarget = tm.targetTouches[0];
                    tm.preventDefault();
                    tm.stopPropagation();
                    return {
                        left: TMTarget.pageX - startX + (-this.currentPageIndex * this.photosetWidth),
                        top: TMTarget.pageY - startY,
                        event: tm
                    }
                }).takeUntil(obTouchStop);
        });

        //const obDrag = Rx.Observable.merge(mouseDrag, obTouchDrag);

        this.obTouchDrag.subscribe(({ left, top, event }) => {
            this.translate(this.$wrapper, left, 0);
            this.emitter.emit("scroll", event);
        });

        this.obTouchDragEnd = this.obTouchStart.flatMap(ts => {
            const TSTarget = ts.targetTouches[0];
            const startX = TSTarget.pageX;
            const startY = TSTarget.pageY;
            this.distX = 0;
            return this.obTouchMove
                //.throttleTime(dt) // 有些人很皮
                .map(tm => {
                    const TMTarget = tm.targetTouches[0];
                    let distX = Math.abs(startX - TMTarget.pageX);
                    let distY = Math.abs(startY - TMTarget.pageY);
                    this.distX += distX;
                    if (distX > 10 || distY > 10) {
                        this.moved = true;
                    }
                    tm.happenTime = new Date();
                    return tm;
                })
                .takeUntil(obTouchStop)
                .pairwise()
                .takeLast(1) //.last() no elements in sequence
                .map(tm => {
                    let sx = tm[1].targetTouches[0].pageX - tm[0].targetTouches[0].pageX;
                    let dt = tm[1].happenTime - tm[0].happenTime
                    let vx = sx / dt;
                    tm.vx = vx;
                    return tm;
                })
        })
        this.obTouchDragEnd.subscribe(event => {
            //console.log("end")
            this._end(event);
        });

        this.obClick = this.obTouchStart.flatMap(ts => {
            this.moved = false;
            return obTouchStop
                .first()
                .map(te => {
                    if (!this.moved) {
                        try {
                            let tsTouch = ts.touches ? ts.touches[0] : ts;
                            te.screenX = tsTouch.screenX;
                            te.screenY = tsTouch.screenY;
                            te.clientX = tsTouch.clientX;
                            te.clientY = tsTouch.clientY;
                        } catch (e) {
                            console.warn(e);
                        };
                        this._triggerCustomClick(te);
                    }
                    return te;
                })

        });
        this.obClick.subscribe();
    }

    destroy() {
        this.obTouchDragEnd.unsubscribe();
        this.obTouchDrag.unsubscribe();
        this.obClick.unsubscribe();
    }
};

export default ObservableScroll;
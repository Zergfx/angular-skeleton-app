import * as _ from "lodash";
import {
	OnInit,
	OnDestroy,
	Directive,
	Renderer2,
	ViewContainerRef,
	Input,
	EmbeddedViewRef,
	TemplateRef,
} from "@angular/core";
import { Subscription, Subject } from "rxjs";
import { tap, filter, pairwise, startWith } from "rxjs/operators";

import { ViewportService, ViewportSizeTypeInfo } from "./viewport.service";

@Directive({
	selector: "[ssvViewportMatcher]",
})
export class SsvViewportMatcher implements OnInit, OnDestroy {
	private _context: SsvViewportMatcherContext = new SsvViewportMatcherContext();
	private _thenTemplateRef: TemplateRef<
		SsvViewportMatcherContext
	> | null = null;
	private _elseTemplateRef: TemplateRef<
		SsvViewportMatcherContext
	> | null = null;
	private _thenViewRef: EmbeddedViewRef<
		SsvViewportMatcherContext
	> | null = null;
	private _elseViewRef: EmbeddedViewRef<
		SsvViewportMatcherContext
	> | null = null;
	private sizeType$$: Subscription | undefined;
	private update$$: Subscription | undefined;
	private cssClass$$: Subscription | undefined;
	private update$ = new Subject<SsvViewportMatcherContext>();
	sizeInfo: ViewportSizeTypeInfo | undefined;

	constructor(
		private viewport: ViewportService,
		private renderer: Renderer2,
		private _viewContainer: ViewContainerRef,
		templateRef: TemplateRef<SsvViewportMatcherContext>,
	) {
		this._thenTemplateRef = templateRef;
	}

	ngOnInit() {
		console.log("ssvViewportMatcher init");

		this.update$$ = this.update$
			.pipe(
				tap(x => console.log(">>> ssvViewportMatcher - update triggered", x)),
				filter(() => !!this.sizeInfo),
				tap(x => console.log(">>> ssvViewportMatcher - updating...", x)),
				tap(() => this._updateView(this.sizeInfo!)),
			)
			.subscribe();

		this.sizeType$$ = this.viewport.sizeType$
			.pipe(
				tap(x => console.info("ssvViewportMatcher - sizeType changed x2", x)),
				tap(x => (this.sizeInfo = x)),
				tap(() => this.update$.next(this._context)),
			)
			.subscribe();

		this.cssClass$$ = this.viewport.sizeType$
			.pipe(
				startWith<ViewportSizeTypeInfo | undefined>(undefined),
				filter(() => !!this._thenViewRef),
				pairwise(),
				tap(([prev, curr]) => {
					const el = this._thenViewRef!.rootNodes[0];
					if (prev) {
						this.renderer.removeClass(el, `vp-size--${prev.name}`);
					}
					this.renderer.addClass(el, `vp-size--${curr!.name}`);
				}),
			)
			.subscribe();
	}

	ngOnDestroy() {
		if (this.cssClass$$) {
			this.cssClass$$.unsubscribe();
		}
		if (this.sizeType$$) {
			this.sizeType$$.unsubscribe();
		}
		if (this.update$$) {
			this.update$$.unsubscribe();
		}
	}

	@Input()
	set ssvViewportMatcher(sizeType: string) {
		console.log(">>> ssvViewportMatcher set", sizeType);
		this._context.sizeType = sizeType;

		if (this.sizeInfo) {
			this.update$.next(this._context);
		}
	}

	@Input()
	set ssvViewportMatcherExclude(sizeType: string) {
		console.log(">>> ssvViewportMatcherExclude set", sizeType);
		this._context.sizeTypeExclude = sizeType;

		if (this.sizeInfo) {
			this.update$.next(this._context);
		}
	}

	private _updateView(sizeInfo: ViewportSizeTypeInfo) {
		console.log(">>> _updateView - #0 start", sizeInfo, this._context);

		if (this.shouldRender(sizeInfo, this._context)) {
			if (!this._thenViewRef) {
				console.log(">>> _updateView - #1 !thenViewRef");
				this._viewContainer.clear();
				this._elseViewRef = null;

				if (this._thenTemplateRef) {
					console.log(">>> _updateView - #2 thenTemplateRef");
					this._thenViewRef = this._viewContainer.createEmbeddedView(
						this._thenTemplateRef,
						this._context,
					);
				}
			}
		} else {
			if (!this._elseViewRef) {
				this._viewContainer.clear();
				this._thenViewRef = null;

				if (this._elseTemplateRef) {
					this._elseViewRef = this._viewContainer.createEmbeddedView(
						this._elseTemplateRef,
						this._context,
					);
				}
			}
		}
	}

	private shouldRender(
		sizeInfo: ViewportSizeTypeInfo,
		context: SsvViewportMatcherContext,
	) {
		const isIncluded = match(context.sizeType, sizeInfo.name, true);
		const isExcluded = match(context.sizeTypeExclude, sizeInfo.name, false);

		const shouldRender = isIncluded && !isExcluded;
		console.warn(">>> shouldRender", { sizeInfo, context, shouldRender });
		return shouldRender;
	}
}

export class SsvViewportMatcherContext {
	sizeType: string | string[] | null = null;
	sizeTypeExclude: string | string[] | null = null;
}

function match(
	sizeType: string | string[] | null,
	currentSizeType: string,
	defaultValue: boolean,
) {
	if (!sizeType) {
		return defaultValue;
	}

	return _.isArray(sizeType)
		? _.includes(sizeType, currentSizeType)
		: sizeType === currentSizeType;
}
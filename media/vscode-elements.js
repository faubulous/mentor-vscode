const t=globalThis,e=t.ShadowRoot&&(void 0===t.ShadyCSS||t.ShadyCSS.nativeShadow)&&"adoptedStyleSheets"in Document.prototype&&"replace"in CSSStyleSheet.prototype,s=Symbol(),i=new WeakMap;let o=class{constructor(t,e,i){if(this._$cssResult$=!0,i!==s)throw Error("CSSResult is not constructable. Use `unsafeCSS` or `css` instead.");this.cssText=t,this.t=e}get styleSheet(){let t=this.o;const s=this.t;if(e&&void 0===t){const e=void 0!==s&&1===s.length;e&&(t=i.get(s)),void 0===t&&((this.o=t=new CSSStyleSheet).replaceSync(this.cssText),e&&i.set(s,t))}return t}toString(){return this.cssText}};const r=t=>new o("string"==typeof t?t:t+"",void 0,s),n=(t,...e)=>{const i=1===t.length?t[0]:e.reduce(((e,s,i)=>e+(t=>{if(!0===t._$cssResult$)return t.cssText;if("number"==typeof t)return t;throw Error("Value passed to 'css' function must be a 'css' function result: "+t+". Use 'unsafeCSS' to pass non-literal values, but take care to ensure page security.")})(s)+t[i+1]),t[0]);return new o(i,t,s)},a=e?t=>t:t=>t instanceof CSSStyleSheet?(t=>{let e="";for(const s of t.cssRules)e+=s.cssText;return r(e)})(t):t,{is:c,defineProperty:l,getOwnPropertyDescriptor:h,getOwnPropertyNames:d,getOwnPropertySymbols:u,getPrototypeOf:v}=Object,p=globalThis,b=p.trustedTypes,f=b?b.emptyScript:"",g=p.reactiveElementPolyfillSupport,m=(t,e)=>t,x={toAttribute(t,e){switch(e){case Boolean:t=t?f:null;break;case Object:case Array:t=null==t?t:JSON.stringify(t)}return t},fromAttribute(t,e){let s=t;switch(e){case Boolean:s=null!==t;break;case Number:s=null===t?null:Number(t);break;case Object:case Array:try{s=JSON.parse(t)}catch(t){s=null}}return s}},y=(t,e)=>!c(t,e),w={attribute:!0,type:String,converter:x,reflect:!1,useDefault:!1,hasChanged:y};Symbol.metadata??=Symbol("metadata"),p.litPropertyMetadata??=new WeakMap;let k=class extends HTMLElement{static addInitializer(t){this._$Ei(),(this.l??=[]).push(t)}static get observedAttributes(){return this.finalize(),this._$Eh&&[...this._$Eh.keys()]}static createProperty(t,e=w){if(e.state&&(e.attribute=!1),this._$Ei(),this.prototype.hasOwnProperty(t)&&((e=Object.create(e)).wrapped=!0),this.elementProperties.set(t,e),!e.noAccessor){const s=Symbol(),i=this.getPropertyDescriptor(t,s,e);void 0!==i&&l(this.prototype,t,i)}}static getPropertyDescriptor(t,e,s){const{get:i,set:o}=h(this.prototype,t)??{get(){return this[e]},set(t){this[e]=t}};return{get:i,set(e){const r=i?.call(this);o?.call(this,e),this.requestUpdate(t,r,s)},configurable:!0,enumerable:!0}}static getPropertyOptions(t){return this.elementProperties.get(t)??w}static _$Ei(){if(this.hasOwnProperty(m("elementProperties")))return;const t=v(this);t.finalize(),void 0!==t.l&&(this.l=[...t.l]),this.elementProperties=new Map(t.elementProperties)}static finalize(){if(this.hasOwnProperty(m("finalized")))return;if(this.finalized=!0,this._$Ei(),this.hasOwnProperty(m("properties"))){const t=this.properties,e=[...d(t),...u(t)];for(const s of e)this.createProperty(s,t[s])}const t=this[Symbol.metadata];if(null!==t){const e=litPropertyMetadata.get(t);if(void 0!==e)for(const[t,s]of e)this.elementProperties.set(t,s)}this._$Eh=new Map;for(const[t,e]of this.elementProperties){const s=this._$Eu(t,e);void 0!==s&&this._$Eh.set(s,t)}this.elementStyles=this.finalizeStyles(this.styles)}static finalizeStyles(t){const e=[];if(Array.isArray(t)){const s=new Set(t.flat(1/0).reverse());for(const t of s)e.unshift(a(t))}else void 0!==t&&e.push(a(t));return e}static _$Eu(t,e){const s=e.attribute;return!1===s?void 0:"string"==typeof s?s:"string"==typeof t?t.toLowerCase():void 0}constructor(){super(),this._$Ep=void 0,this.isUpdatePending=!1,this.hasUpdated=!1,this._$Em=null,this._$Ev()}_$Ev(){this._$ES=new Promise((t=>this.enableUpdating=t)),this._$AL=new Map,this._$E_(),this.requestUpdate(),this.constructor.l?.forEach((t=>t(this)))}addController(t){(this._$EO??=new Set).add(t),void 0!==this.renderRoot&&this.isConnected&&t.hostConnected?.()}removeController(t){this._$EO?.delete(t)}_$E_(){const t=new Map,e=this.constructor.elementProperties;for(const s of e.keys())this.hasOwnProperty(s)&&(t.set(s,this[s]),delete this[s]);t.size>0&&(this._$Ep=t)}createRenderRoot(){const s=this.shadowRoot??this.attachShadow(this.constructor.shadowRootOptions);return((s,i)=>{if(e)s.adoptedStyleSheets=i.map((t=>t instanceof CSSStyleSheet?t:t.styleSheet));else for(const e of i){const i=document.createElement("style"),o=t.litNonce;void 0!==o&&i.setAttribute("nonce",o),i.textContent=e.cssText,s.appendChild(i)}})(s,this.constructor.elementStyles),s}connectedCallback(){this.renderRoot??=this.createRenderRoot(),this.enableUpdating(!0),this._$EO?.forEach((t=>t.hostConnected?.()))}enableUpdating(t){}disconnectedCallback(){this._$EO?.forEach((t=>t.hostDisconnected?.()))}attributeChangedCallback(t,e,s){this._$AK(t,s)}_$ET(t,e){const s=this.constructor.elementProperties.get(t),i=this.constructor._$Eu(t,s);if(void 0!==i&&!0===s.reflect){const o=(void 0!==s.converter?.toAttribute?s.converter:x).toAttribute(e,s.type);this._$Em=t,null==o?this.removeAttribute(i):this.setAttribute(i,o),this._$Em=null}}_$AK(t,e){const s=this.constructor,i=s._$Eh.get(t);if(void 0!==i&&this._$Em!==i){const t=s.getPropertyOptions(i),o="function"==typeof t.converter?{fromAttribute:t.converter}:void 0!==t.converter?.fromAttribute?t.converter:x;this._$Em=i,this[i]=o.fromAttribute(e,t.type)??this._$Ej?.get(i)??null,this._$Em=null}}requestUpdate(t,e,s){if(void 0!==t){const i=this.constructor,o=this[t];if(s??=i.getPropertyOptions(t),!((s.hasChanged??y)(o,e)||s.useDefault&&s.reflect&&o===this._$Ej?.get(t)&&!this.hasAttribute(i._$Eu(t,s))))return;this.C(t,e,s)}!1===this.isUpdatePending&&(this._$ES=this._$EP())}C(t,e,{useDefault:s,reflect:i,wrapped:o},r){s&&!(this._$Ej??=new Map).has(t)&&(this._$Ej.set(t,r??e??this[t]),!0!==o||void 0!==r)||(this._$AL.has(t)||(this.hasUpdated||s||(e=void 0),this._$AL.set(t,e)),!0===i&&this._$Em!==t&&(this._$Eq??=new Set).add(t))}async _$EP(){this.isUpdatePending=!0;try{await this._$ES}catch(t){Promise.reject(t)}const t=this.scheduleUpdate();return null!=t&&await t,!this.isUpdatePending}scheduleUpdate(){return this.performUpdate()}performUpdate(){if(!this.isUpdatePending)return;if(!this.hasUpdated){if(this.renderRoot??=this.createRenderRoot(),this._$Ep){for(const[t,e]of this._$Ep)this[t]=e;this._$Ep=void 0}const t=this.constructor.elementProperties;if(t.size>0)for(const[e,s]of t){const{wrapped:t}=s,i=this[e];!0!==t||this._$AL.has(e)||void 0===i||this.C(e,void 0,s,i)}}let t=!1;const e=this._$AL;try{t=this.shouldUpdate(e),t?(this.willUpdate(e),this._$EO?.forEach((t=>t.hostUpdate?.())),this.update(e)):this._$EM()}catch(e){throw t=!1,this._$EM(),e}t&&this._$AE(e)}willUpdate(t){}_$AE(t){this._$EO?.forEach((t=>t.hostUpdated?.())),this.hasUpdated||(this.hasUpdated=!0,this.firstUpdated(t)),this.updated(t)}_$EM(){this._$AL=new Map,this.isUpdatePending=!1}get updateComplete(){return this.getUpdateComplete()}getUpdateComplete(){return this._$ES}shouldUpdate(t){return!0}update(t){this._$Eq&&=this._$Eq.forEach((t=>this._$ET(t,this[t]))),this._$EM()}updated(t){}firstUpdated(t){}};k.elementStyles=[],k.shadowRootOptions={mode:"open"},k[m("elementProperties")]=new Map,k[m("finalized")]=new Map,g?.({ReactiveElement:k}),(p.reactiveElementVersions??=[]).push("2.1.0");const $=globalThis,_=$.trustedTypes,C=_?_.createPolicy("lit-html",{createHTML:t=>t}):void 0,B="$lit$",S=`lit$${Math.random().toFixed(9).slice(2)}$`,z="?"+S,O=`<${z}>`,A=document,E=()=>A.createComment(""),j=t=>null===t||"object"!=typeof t&&"function"!=typeof t,I=Array.isArray,M="[ \t\n\f\r]",F=/<(?:(!--|\/[^a-zA-Z])|(\/?[a-zA-Z][^>\s]*)|(\/?$))/g,P=/-->/g,N=/>/g,D=RegExp(`>|${M}(?:([^\\s"'>=/]+)(${M}*=${M}*(?:[^ \t\n\f\r"'\`<>=]|("|')|))|$)`,"g"),V=/'/g,R=/"/g,T=/^(?:script|style|textarea|title)$/i,L=(t=>(e,...s)=>({_$litType$:t,strings:e,values:s}))(1),U=Symbol.for("lit-noChange"),q=Symbol.for("lit-nothing"),H=new WeakMap,K=A.createTreeWalker(A,129);function W(t,e){if(!I(t)||!t.hasOwnProperty("raw"))throw Error("invalid template strings array");return void 0!==C?C.createHTML(e):e}const G=(t,e)=>{const s=t.length-1,i=[];let o,r=2===e?"<svg>":3===e?"<math>":"",n=F;for(let e=0;e<s;e++){const s=t[e];let a,c,l=-1,h=0;for(;h<s.length&&(n.lastIndex=h,c=n.exec(s),null!==c);)h=n.lastIndex,n===F?"!--"===c[1]?n=P:void 0!==c[1]?n=N:void 0!==c[2]?(T.test(c[2])&&(o=RegExp("</"+c[2],"g")),n=D):void 0!==c[3]&&(n=D):n===D?">"===c[0]?(n=o??F,l=-1):void 0===c[1]?l=-2:(l=n.lastIndex-c[2].length,a=c[1],n=void 0===c[3]?D:'"'===c[3]?R:V):n===R||n===V?n=D:n===P||n===N?n=F:(n=D,o=void 0);const d=n===D&&t[e+1].startsWith("/>")?" ":"";r+=n===F?s+O:l>=0?(i.push(a),s.slice(0,l)+B+s.slice(l)+S+d):s+S+(-2===l?e:d)}return[W(t,r+(t[s]||"<?>")+(2===e?"</svg>":3===e?"</math>":"")),i]};class J{constructor({strings:t,_$litType$:e},s){let i;this.parts=[];let o=0,r=0;const n=t.length-1,a=this.parts,[c,l]=G(t,e);if(this.el=J.createElement(c,s),K.currentNode=this.el.content,2===e||3===e){const t=this.el.content.firstChild;t.replaceWith(...t.childNodes)}for(;null!==(i=K.nextNode())&&a.length<n;){if(1===i.nodeType){if(i.hasAttributes())for(const t of i.getAttributeNames())if(t.endsWith(B)){const e=l[r++],s=i.getAttribute(t).split(S),n=/([.?@])?(.*)/.exec(e);a.push({type:1,index:o,name:n[2],strings:s,ctor:"."===n[1]?Q:"?"===n[1]?tt:"@"===n[1]?et:Z}),i.removeAttribute(t)}else t.startsWith(S)&&(a.push({type:6,index:o}),i.removeAttribute(t));if(T.test(i.tagName)){const t=i.textContent.split(S),e=t.length-1;if(e>0){i.textContent=_?_.emptyScript:"";for(let s=0;s<e;s++)i.append(t[s],E()),K.nextNode(),a.push({type:2,index:++o});i.append(t[e],E())}}}else if(8===i.nodeType)if(i.data===z)a.push({type:2,index:o});else{let t=-1;for(;-1!==(t=i.data.indexOf(S,t+1));)a.push({type:7,index:o}),t+=S.length-1}o++}}static createElement(t,e){const s=A.createElement("template");return s.innerHTML=t,s}}function Y(t,e,s=t,i){if(e===U)return e;let o=void 0!==i?s._$Co?.[i]:s._$Cl;const r=j(e)?void 0:e._$litDirective$;return o?.constructor!==r&&(o?._$AO?.(!1),void 0===r?o=void 0:(o=new r(t),o._$AT(t,s,i)),void 0!==i?(s._$Co??=[])[i]=o:s._$Cl=o),void 0!==o&&(e=Y(t,o._$AS(t,e.values),o,i)),e}class X{get _$AU(){return this._$AM?._$AU??this._$Cv}constructor(t,e,s,i){this.type=2,this._$AH=q,this._$AN=void 0,this._$AA=t,this._$AB=e,this._$AM=s,this.options=i,this._$Cv=i?.isConnected??!0}get parentNode(){let t=this._$AA.parentNode;const e=this._$AM;return void 0!==e&&11===t?.nodeType&&(t=e.parentNode),t}get startNode(){return this._$AA}get endNode(){return this._$AB}_$AI(t,e=this){t=Y(this,t,e),j(t)?t===q||null==t||""===t?(this._$AH!==q&&this._$AR(),this._$AH=q):t!==this._$AH&&t!==U&&this._(t):void 0!==t._$litType$?this.$(t):void 0!==t.nodeType?this.T(t):(t=>I(t)||"function"==typeof t?.[Symbol.iterator])(t)?this.k(t):this._(t)}O(t){return this._$AA.parentNode.insertBefore(t,this._$AB)}T(t){this._$AH!==t&&(this._$AR(),this._$AH=this.O(t))}_(t){this._$AH!==q&&j(this._$AH)?this._$AA.nextSibling.data=t:this.T(A.createTextNode(t)),this._$AH=t}$(t){const{values:e,_$litType$:s}=t,i="number"==typeof s?this._$AC(t):(void 0===s.el&&(s.el=J.createElement(W(s.h,s.h[0]),this.options)),s);if(this._$AH?._$AD===i)this._$AH.p(e);else{const t=new class{constructor(t,e){this._$AV=[],this._$AN=void 0,this._$AD=t,this._$AM=e}get parentNode(){return this._$AM.parentNode}get _$AU(){return this._$AM._$AU}u(t){const{el:{content:e},parts:s}=this._$AD,i=(t?.creationScope??A).importNode(e,!0);K.currentNode=i;let o=K.nextNode(),r=0,n=0,a=s[0];for(;void 0!==a;){if(r===a.index){let e;2===a.type?e=new X(o,o.nextSibling,this,t):1===a.type?e=new a.ctor(o,a.name,a.strings,this,t):6===a.type&&(e=new st(o,this,t)),this._$AV.push(e),a=s[++n]}r!==a?.index&&(o=K.nextNode(),r++)}return K.currentNode=A,i}p(t){let e=0;for(const s of this._$AV)void 0!==s&&(void 0!==s.strings?(s._$AI(t,s,e),e+=s.strings.length-2):s._$AI(t[e])),e++}}(i,this),s=t.u(this.options);t.p(e),this.T(s),this._$AH=t}}_$AC(t){let e=H.get(t.strings);return void 0===e&&H.set(t.strings,e=new J(t)),e}k(t){I(this._$AH)||(this._$AH=[],this._$AR());const e=this._$AH;let s,i=0;for(const o of t)i===e.length?e.push(s=new X(this.O(E()),this.O(E()),this,this.options)):s=e[i],s._$AI(o),i++;i<e.length&&(this._$AR(s&&s._$AB.nextSibling,i),e.length=i)}_$AR(t=this._$AA.nextSibling,e){for(this._$AP?.(!1,!0,e);t&&t!==this._$AB;){const e=t.nextSibling;t.remove(),t=e}}setConnected(t){void 0===this._$AM&&(this._$Cv=t,this._$AP?.(t))}}class Z{get tagName(){return this.element.tagName}get _$AU(){return this._$AM._$AU}constructor(t,e,s,i,o){this.type=1,this._$AH=q,this._$AN=void 0,this.element=t,this.name=e,this._$AM=i,this.options=o,s.length>2||""!==s[0]||""!==s[1]?(this._$AH=Array(s.length-1).fill(new String),this.strings=s):this._$AH=q}_$AI(t,e=this,s,i){const o=this.strings;let r=!1;if(void 0===o)t=Y(this,t,e,0),r=!j(t)||t!==this._$AH&&t!==U,r&&(this._$AH=t);else{const i=t;let n,a;for(t=o[0],n=0;n<o.length-1;n++)a=Y(this,i[s+n],e,n),a===U&&(a=this._$AH[n]),r||=!j(a)||a!==this._$AH[n],a===q?t=q:t!==q&&(t+=(a??"")+o[n+1]),this._$AH[n]=a}r&&!i&&this.j(t)}j(t){t===q?this.element.removeAttribute(this.name):this.element.setAttribute(this.name,t??"")}}class Q extends Z{constructor(){super(...arguments),this.type=3}j(t){this.element[this.name]=t===q?void 0:t}}class tt extends Z{constructor(){super(...arguments),this.type=4}j(t){this.element.toggleAttribute(this.name,!!t&&t!==q)}}class et extends Z{constructor(t,e,s,i,o){super(t,e,s,i,o),this.type=5}_$AI(t,e=this){if((t=Y(this,t,e,0)??q)===U)return;const s=this._$AH,i=t===q&&s!==q||t.capture!==s.capture||t.once!==s.once||t.passive!==s.passive,o=t!==q&&(s===q||i);i&&this.element.removeEventListener(this.name,this,s),o&&this.element.addEventListener(this.name,this,t),this._$AH=t}handleEvent(t){"function"==typeof this._$AH?this._$AH.call(this.options?.host??this.element,t):this._$AH.handleEvent(t)}}class st{constructor(t,e,s){this.element=t,this.type=6,this._$AN=void 0,this._$AM=e,this.options=s}get _$AU(){return this._$AM._$AU}_$AI(t){Y(this,t)}}const it={I:X},ot=$.litHtmlPolyfillSupport;ot?.(J,X),($.litHtmlVersions??=[]).push("3.3.0");const rt=(t,e,s)=>{const i=s?.renderBefore??e;let o=i._$litPart$;if(void 0===o){const t=s?.renderBefore??null;i._$litPart$=o=new X(e.insertBefore(E(),t),t,void 0,s??{})}return o._$AI(t),o},nt=globalThis;let at=class extends k{constructor(){super(...arguments),this.renderOptions={host:this},this._$Do=void 0}createRenderRoot(){const t=super.createRenderRoot();return this.renderOptions.renderBefore??=t.firstChild,t}update(t){const e=this.render();this.hasUpdated||(this.renderOptions.isConnected=this.isConnected),super.update(t),this._$Do=rt(e,this.renderRoot,this.renderOptions)}connectedCallback(){super.connectedCallback(),this._$Do?.setConnected(!0)}disconnectedCallback(){super.disconnectedCallback(),this._$Do?.setConnected(!1)}render(){return U}};at._$litElement$=!0,at.finalized=!0,nt.litElementHydrateSupport?.({LitElement:at});const ct=nt.litElementPolyfillSupport;ct?.({LitElement:at}),(nt.litElementVersions??=[]).push("4.2.0");const lt={attribute:!0,type:String,converter:x,reflect:!1,hasChanged:y},ht=(t=lt,e,s)=>{const{kind:i,metadata:o}=s;let r=globalThis.litPropertyMetadata.get(o);if(void 0===r&&globalThis.litPropertyMetadata.set(o,r=new Map),"setter"===i&&((t=Object.create(t)).wrapped=!0),r.set(s.name,t),"accessor"===i){const{name:i}=s;return{set(s){const o=e.get.call(this);e.set.call(this,s),this.requestUpdate(i,o,t)},init(e){return void 0!==e&&this.C(i,void 0,t,e),e}}}if("setter"===i){const{name:i}=s;return function(s){const o=this[i];e.call(this,s),this.requestUpdate(i,o,t)}}throw Error("Unsupported decorator location: "+i)};function dt(t){return(e,s)=>"object"==typeof s?ht(t,e,s):((t,e,s)=>{const i=e.hasOwnProperty(s);return e.constructor.createProperty(s,t),i?Object.getOwnPropertyDescriptor(e,s):void 0})(t,e,s)}function ut(t){return dt({...t,state:!0,attribute:!1})}const vt=(t,e,s)=>(s.configurable=!0,s.enumerable=!0,s);function pt(t,e){return(s,i,o)=>{const r=e=>e.renderRoot?.querySelector(t)??null;if(e){const{get:t,set:e}="object"==typeof i?s:o??(()=>{const t=Symbol();return{get(){return this[t]},set(e){this[t]=e}}})();return vt(0,0,{get(){let s=t.call(this);return void 0===s&&(s=r(this),(null!==s||this.hasUpdated)&&e.call(this,s)),s}})}return vt(0,0,{get(){return r(this)}})}}let bt;function ft(t){return(e,s)=>{const{slot:i,selector:o}=t??{},r="slot"+(i?`[name=${i}]`:":not([name])");return vt(0,0,{get(){const e=this.renderRoot?.querySelector(r),s=e?.assignedElements(t)??[];return void 0===o?s:s.filter((t=>t.matches(o)))}})}}const gt="1.16.1",mt="__vscodeElements_disableRegistryWarning__";class xt extends at{get version(){return gt}}const yt=t=>e=>{if(!customElements.get(t))return void customElements.define(t,e);if(mt in window)return;const s=document.createElement(t),i=s?.version;let o="";i?i!==gt?(o+="is already registered by a different version of VSCode Elements. ",o+=`This version is "${gt}", while the other one is "${i}".`):o+="is already registered by the same version of VSCode Elements. ":(console.warn(t,"is already registered by an unknown custom element handler class."),o+="is already registered by an unknown custom element handler class."),console.warn(`[VSCode Elements] ${t} ${o}\nTo suppress this warning, set window.${mt} to true`)};var wt=n`
  :host([hidden]) {
    display: none;
  }

  :host([disabled]),
  :host(:disabled) {
    cursor: not-allowed;
    opacity: 0.4;
    pointer-events: none;
  }
`;function kt(){return navigator.userAgent.indexOf("Linux")>-1?'system-ui, "Ubuntu", "Droid Sans", sans-serif':navigator.userAgent.indexOf("Mac")>-1?"-apple-system, BlinkMacSystemFont, sans-serif":navigator.userAgent.indexOf("Windows")>-1?'"Segoe WPC", "Segoe UI", sans-serif':"sans-serif"}const $t=[wt,n`
    :host {
      background-color: var(--vscode-badge-background, #616161);
      border: 1px solid var(--vscode-contrastBorder, transparent);
      border-radius: 2px;
      box-sizing: border-box;
      color: var(--vscode-badge-foreground, #f8f8f8);
      display: inline-block;
      font-family: var(--vscode-font-family, ${r(kt())});
      font-size: 11px;
      font-weight: 400;
      line-height: 14px;
      min-width: 18px;
      padding: 2px 3px;
      text-align: center;
      white-space: nowrap;
    }

    :host([variant='counter']) {
      border-radius: 11px;
      line-height: 11px;
      min-height: 18px;
      min-width: 18px;
      padding: 3px 6px;
    }

    :host([variant='activity-bar-counter']) {
      background-color: var(--vscode-activityBarBadge-background, #0078d4);
      border-radius: 20px;
      color: var(--vscode-activityBarBadge-foreground, #ffffff);
      font-size: 9px;
      font-weight: 600;
      line-height: 16px;
      padding: 0 4px;
    }

    :host([variant='tab-header-counter']) {
      background-color: var(--vscode-activityBarBadge-background, #0078d4);
      border-radius: 10px;
      color: var(--vscode-activityBarBadge-foreground, #ffffff);
      line-height: 10px;
      min-height: 16px;
      min-width: 16px;
      padding: 3px 5px;
    }
  `];var _t=function(t,e,s,i){for(var o,r=arguments.length,n=r<3?e:null===i?i=Object.getOwnPropertyDescriptor(e,s):i,a=t.length-1;a>=0;a--)(o=t[a])&&(n=(r<3?o(n):r>3?o(e,s,n):o(e,s))||n);return r>3&&n&&Object.defineProperty(e,s,n),n};let Ct=class extends xt{constructor(){super(...arguments),this.variant="default"}render(){return L` <slot></slot> `}};Ct.styles=$t,_t([dt({reflect:!0})],Ct.prototype,"variant",void 0),Ct=_t([yt("vscode-badge")],Ct);const Bt=1,St=2,zt=3,Ot=t=>(...e)=>({_$litDirective$:t,values:e});class At{constructor(t){}get _$AU(){return this._$AM._$AU}_$AT(t,e,s){this._$Ct=t,this._$AM=e,this._$Ci=s}_$AS(t,e){return this.update(t,e)}update(t,e){return this.render(...e)}}const Et=Ot(class extends At{constructor(t){if(super(t),t.type!==Bt||"class"!==t.name||t.strings?.length>2)throw Error("`classMap()` can only be used in the `class` attribute and must be the only part in the attribute.")}render(t){return" "+Object.keys(t).filter((e=>t[e])).join(" ")+" "}update(t,[e]){if(void 0===this.st){this.st=new Set,void 0!==t.strings&&(this.nt=new Set(t.strings.join(" ").split(/\s/).filter((t=>""!==t))));for(const t in e)e[t]&&!this.nt?.has(t)&&this.st.add(t);return this.render(e)}const s=t.element.classList;for(const t of this.st)t in e||(s.remove(t),this.st.delete(t));for(const t in e){const i=!!e[t];i===this.st.has(t)||this.nt?.has(t)||(i?(s.add(t),this.st.add(t)):(s.remove(t),this.st.delete(t)))}return U}}),jt=t=>t??q;const It=Ot(class extends At{constructor(t){if(super(t),this._prevProperties={},t.type!==zt||"style"!==t.name)throw new Error("The `stylePropertyMap` directive must be used in the `style` property")}update(t,[e]){return Object.entries(e).forEach((([e,s])=>{this._prevProperties[e]!==s&&(e.startsWith("--")?t.element.style.setProperty(e,s):t.element.style[e]=s,this._prevProperties[e]=s)})),U}render(t){return U}}),Mt=[wt,n`
    :host {
      color: var(--vscode-icon-foreground, #cccccc);
      display: inline-block;
    }

    .codicon[class*='codicon-'] {
      display: block;
    }

    .icon,
    .button {
      background-color: transparent;
      display: block;
      padding: 0;
    }

    .button {
      border-color: transparent;
      border-style: solid;
      border-width: 1px;
      border-radius: 5px;
      color: currentColor;
      cursor: pointer;
      padding: 2px;
    }

    .button:hover {
      background-color: var(
        --vscode-toolbar-hoverBackground,
        rgba(90, 93, 94, 0.31)
      );
    }

    .button:active {
      background-color: var(
        --vscode-toolbar-activeBackground,
        rgba(99, 102, 103, 0.31)
      );
    }

    .button:focus {
      outline: none;
    }

    .button:focus-visible {
      border-color: var(--vscode-focusBorder, #0078d4);
    }

    @keyframes icon-spin {
      100% {
        transform: rotate(360deg);
      }
    }

    .spin {
      animation-name: icon-spin;
      animation-timing-function: linear;
      animation-iteration-count: infinite;
    }
  `];var Ft,Pt=function(t,e,s,i){for(var o,r=arguments.length,n=r<3?e:null===i?i=Object.getOwnPropertyDescriptor(e,s):i,a=t.length-1;a>=0;a--)(o=t[a])&&(n=(r<3?o(n):r>3?o(e,s,n):o(e,s))||n);return r>3&&n&&Object.defineProperty(e,s,n),n};let Nt=Ft=class extends xt{constructor(){super(...arguments),this.label="",this.name="",this.size=16,this.spin=!1,this.spinDuration=1.5,this.actionIcon=!1,this._onButtonClick=t=>{this.dispatchEvent(new CustomEvent("vsc-click",{detail:{originalEvent:t}}))}}connectedCallback(){super.connectedCallback();const{href:t,nonce:e}=this._getStylesheetConfig();Ft.stylesheetHref=t,Ft.nonce=e}_getStylesheetConfig(){const t=document.getElementById("vscode-codicon-stylesheet"),e=t?.getAttribute("href")||void 0,s=t?.nonce||void 0;if(!t){let t="[VSCode Elements] To use the Icon component, the codicons.css file must be included in the page with the id `vscode-codicon-stylesheet`! ";t+="See https://vscode-elements.github.io/components/icon/ for more details.",console.warn(t)}return{nonce:s,href:e}}render(){const{stylesheetHref:t,nonce:e}=Ft,s=L`<span
      class=${Et({codicon:!0,["codicon-"+this.name]:!0,spin:this.spin})}
      .style=${It({animationDuration:String(this.spinDuration)+"s",fontSize:this.size+"px",height:this.size+"px",width:this.size+"px"})}
    ></span>`,i=this.actionIcon?L` <button
          class="button"
          @click=${this._onButtonClick}
          aria-label=${this.label}
        >
          ${s}
        </button>`:L` <span class="icon" aria-hidden="true" role="presentation"
          >${s}</span
        >`;return L`
      <link
        rel="stylesheet"
        href=${jt(t)}
        nonce=${jt(e)}
      >
      ${i}
    `}};Nt.styles=Mt,Nt.stylesheetHref="",Nt.nonce="",Pt([dt()],Nt.prototype,"label",void 0),Pt([dt({type:String})],Nt.prototype,"name",void 0),Pt([dt({type:Number})],Nt.prototype,"size",void 0),Pt([dt({type:Boolean,reflect:!0})],Nt.prototype,"spin",void 0),Pt([dt({type:Number,attribute:"spin-duration"})],Nt.prototype,"spinDuration",void 0),Pt([dt({type:Boolean,reflect:!0,attribute:"action-icon"})],Nt.prototype,"actionIcon",void 0),Nt=Ft=Pt([yt("vscode-icon")],Nt);const Dt=[wt,n`
    :host {
      background-color: var(--vscode-button-background, #0078d4);
      border-color: var(--vscode-button-border, transparent);
      border-style: solid;
      border-radius: 2px;
      border-width: 1px;
      color: var(--vscode-button-foreground, #ffffff);
      cursor: pointer;
      display: inline-flex;
      font-family: var(--vscode-font-family, ${r(kt())});
      font-size: var(--vscode-font-size, 13px);
      font-weight: var(--vscode-font-weight, normal);
      line-height: 22px;
      overflow: hidden;
      padding: 0;
      user-select: none;
      white-space: nowrap;
    }

    :host([secondary]) {
      color: var(--vscode-button-secondaryForeground, #cccccc);
      background-color: var(--vscode-button-secondaryBackground, #313131);
      border-color: var(
        --vscode-button-border,
        var(--vscode-button-secondaryBackground, rgba(255, 255, 255, 0.07))
      );
    }

    :host([disabled]) {
      cursor: default;
      opacity: 0.4;
      pointer-events: none;
    }

    :host(:hover) {
      background-color: var(--vscode-button-hoverBackground, #026ec1);
    }

    :host([disabled]:hover) {
      background-color: var(--vscode-button-background, #0078d4);
    }

    :host([secondary]:hover) {
      background-color: var(--vscode-button-secondaryHoverBackground, #3c3c3c);
    }

    :host([secondary][disabled]:hover) {
      background-color: var(--vscode-button-secondaryBackground, #313131);
    }

    :host(:focus),
    :host(:active) {
      outline: none;
    }

    :host(:focus) {
      background-color: var(--vscode-button-hoverBackground, #026ec1);
      outline: 1px solid var(--vscode-focusBorder, #0078d4);
      outline-offset: 2px;
    }

    :host([disabled]:focus) {
      background-color: var(--vscode-button-background, #0078d4);
      outline: 0;
    }

    :host([secondary]:focus) {
      background-color: var(--vscode-button-secondaryHoverBackground, #3c3c3c);
    }

    :host([secondary][disabled]:focus) {
      background-color: var(--vscode-button-secondaryBackground, #313131);
    }

    ::slotted(*) {
      display: inline-block;
      margin-left: 4px;
      margin-right: 4px;
    }

    ::slotted(*:first-child) {
      margin-left: 0;
    }

    ::slotted(*:last-child) {
      margin-right: 0;
    }

    ::slotted(vscode-icon) {
      color: inherit;
    }

    .wrapper {
      align-items: center;
      box-sizing: border-box;
      display: flex;
      justify-content: center;
      position: relative;
      width: 100%;
      height: 100%;
      padding: 1px 13px;
    }

    :host(:empty) .wrapper,
    :host([icon-only]) .wrapper {
      min-height: 24px;
      min-width: 16px;
      padding: 1px 5px;
    }

    slot {
      align-items: center;
      display: flex;
      height: 100%;
    }

    .icon,
    .icon-after {
      color: inherit;
      display: block;
    }

    :host(:not(:empty)) .icon {
      margin-right: 3px;
    }

    :host(:not(:empty)) .icon-after,
    :host([icon]) .icon-after {
      margin-left: 3px;
    }

    .divider {
      display: var(--divider-display, none);
      background-color: transparent;
      padding: 4px 0;
      box-sizing: border-box;
    }

    :host(:hover) .divider,
    :host(:focus) .divider {
      background-color: var(--vscode-button-hoverBackground, #026ec1);
    }

    :host([secondary]) .divider {
      background-color: var(--vscode-button-secondaryBackground, #313131);
    }

    :host([secondary]:hover) .divider,
    :host([secondary]:focus) .divider {
      background-color: var(--vscode-button-secondaryHoverBackground, #3c3c3c);
    }

    .divider > div {
      background-color: var(
        --vscode-button-separator,
        rgba(255, 255, 255, 0.4)
      );
      height: 100%;
      width: 1px;
      margin: 0;
    }

    :host([secondary]) .divider > div {
      background-color: var(--vscode-button-secondaryForeground, #cccccc);
      opacity: 0.4;
    }
  `];var Vt=function(t,e,s,i){for(var o,r=arguments.length,n=r<3?e:null===i?i=Object.getOwnPropertyDescriptor(e,s):i,a=t.length-1;a>=0;a--)(o=t[a])&&(n=(r<3?o(n):r>3?o(e,s,n):o(e,s))||n);return r>3&&n&&Object.defineProperty(e,s,n),n};let Rt=class extends xt{get form(){return this._internals.form}constructor(){super(),this.autofocus=!1,this.tabIndex=0,this.secondary=!1,this.role="button",this.disabled=!1,this.icon="",this.iconSpin=!1,this.iconAfter="",this.iconAfterSpin=!1,this.focused=!1,this.name=void 0,this.iconOnly=!1,this.type="button",this.value="",this._prevTabindex=0,this._handleFocus=()=>{this.focused=!0},this._handleBlur=()=>{this.focused=!1},this.addEventListener("keydown",this._handleKeyDown.bind(this)),this.addEventListener("click",this._handleClick.bind(this)),this._internals=this.attachInternals()}connectedCallback(){super.connectedCallback(),this.autofocus&&(this.tabIndex<0&&(this.tabIndex=0),this.updateComplete.then((()=>{this.focus(),this.requestUpdate()}))),this.addEventListener("focus",this._handleFocus),this.addEventListener("blur",this._handleBlur)}disconnectedCallback(){super.disconnectedCallback(),this.removeEventListener("focus",this._handleFocus),this.removeEventListener("blur",this._handleBlur)}update(t){super.update(t),t.has("value")&&this._internals.setFormValue(this.value),t.has("disabled")&&(this.disabled?(this._prevTabindex=this.tabIndex,this.tabIndex=-1):this.tabIndex=this._prevTabindex)}_executeAction(){"submit"===this.type&&this._internals.form&&this._internals.form.requestSubmit(),"reset"===this.type&&this._internals.form&&this._internals.form.reset()}_handleKeyDown(t){if(("Enter"===t.key||" "===t.key)&&!this.hasAttribute("disabled")){this.dispatchEvent(new CustomEvent("vsc-click",{detail:{originalEvent:new MouseEvent("click")}}));const t=new MouseEvent("click",{bubbles:!0,cancelable:!0});t.synthetic=!0,this.dispatchEvent(t),this._executeAction()}}_handleClick(t){t.synthetic||this.hasAttribute("disabled")||(this.dispatchEvent(new CustomEvent("vsc-click",{detail:{originalEvent:t}})),this._executeAction())}render(){const t=""!==this.icon,e=""!==this.iconAfter,s={wrapper:!0,"has-icon-before":t,"has-icon-after":e,"icon-only":this.iconOnly},i=t?L`<vscode-icon
          name=${this.icon}
          ?spin=${this.iconSpin}
          spin-duration=${jt(this.iconSpinDuration)}
          class="icon"
        ></vscode-icon>`:q,o=e?L`<vscode-icon
          name=${this.iconAfter}
          ?spin=${this.iconAfterSpin}
          spin-duration=${jt(this.iconAfterSpinDuration)}
          class="icon-after"
        ></vscode-icon>`:q;return L`
      <span class=${Et(s)}>
        ${i}
        <slot></slot>
        ${o}
      </span>
      <div class="divider"><div></div></div>
    `}};Rt.styles=Dt,Rt.formAssociated=!0,Vt([dt({type:Boolean,reflect:!0})],Rt.prototype,"autofocus",void 0),Vt([dt({type:Number,reflect:!0})],Rt.prototype,"tabIndex",void 0),Vt([dt({type:Boolean,reflect:!0})],Rt.prototype,"secondary",void 0),Vt([dt({reflect:!0})],Rt.prototype,"role",void 0),Vt([dt({type:Boolean,reflect:!0})],Rt.prototype,"disabled",void 0),Vt([dt()],Rt.prototype,"icon",void 0),Vt([dt({type:Boolean,reflect:!0,attribute:"icon-spin"})],Rt.prototype,"iconSpin",void 0),Vt([dt({type:Number,reflect:!0,attribute:"icon-spin-duration"})],Rt.prototype,"iconSpinDuration",void 0),Vt([dt({attribute:"icon-after"})],Rt.prototype,"iconAfter",void 0),Vt([dt({type:Boolean,reflect:!0,attribute:"icon-after-spin"})],Rt.prototype,"iconAfterSpin",void 0),Vt([dt({type:Number,reflect:!0,attribute:"icon-after-spin-duration"})],Rt.prototype,"iconAfterSpinDuration",void 0),Vt([dt({type:Boolean,reflect:!0})],Rt.prototype,"focused",void 0),Vt([dt({type:String,reflect:!0})],Rt.prototype,"name",void 0),Vt([dt({type:Boolean,reflect:!0,attribute:"icon-only"})],Rt.prototype,"iconOnly",void 0),Vt([dt({reflect:!0})],Rt.prototype,"type",void 0),Vt([dt()],Rt.prototype,"value",void 0),Rt=Vt([yt("vscode-button")],Rt);const Tt=[wt,n`
    :host {
      display: inline-flex;
      align-items: stretch;
      padding: 0;
      border: none;
    }

    ::slotted(vscode-button:not(:first-child)) {
      border-top-left-radius: 0;
      border-bottom-left-radius: 0;
      border-left-width: 0;
    }

    ::slotted(vscode-button:not(:last-child)) {
      --divider-display: block;

      border-top-right-radius: 0;
      border-bottom-right-radius: 0;
      border-right-width: 0;
    }

    ::slotted(vscode-button:focus) {
      z-index: 1;
    }
  `];var Lt=function(t,e,s,i){for(var o,r=arguments.length,n=r<3?e:null===i?i=Object.getOwnPropertyDescriptor(e,s):i,a=t.length-1;a>=0;a--)(o=t[a])&&(n=(r<3?o(n):r>3?o(e,s,n):o(e,s))||n);return r>3&&n&&Object.defineProperty(e,s,n),n};let Ut=class extends xt{render(){return L` <slot></slot> `}};Ut.styles=Tt,Ut=Lt([(t=>(e,s)=>{void 0!==s?s.addInitializer((()=>{customElements.define(t,e)})):customElements.define(t,e)})("vscode-button-group")],Ut);var qt=function(t,e,s,i){for(var o,r=arguments.length,n=r<3?e:null===i?i=Object.getOwnPropertyDescriptor(e,s):i,a=t.length-1;a>=0;a--)(o=t[a])&&(n=(r<3?o(n):r>3?o(e,s,n):o(e,s))||n);return r>3&&n&&Object.defineProperty(e,s,n),n};class Ht extends xt{constructor(){super(),this.focused=!1,this._prevTabindex=0,this._handleFocus=()=>{this.focused=!0},this._handleBlur=()=>{this.focused=!1}}connectedCallback(){super.connectedCallback(),this.addEventListener("focus",this._handleFocus),this.addEventListener("blur",this._handleBlur)}disconnectedCallback(){super.disconnectedCallback(),this.removeEventListener("focus",this._handleFocus),this.removeEventListener("blur",this._handleBlur)}attributeChangedCallback(t,e,s){super.attributeChangedCallback(t,e,s),"disabled"===t&&this.hasAttribute("disabled")?(this._prevTabindex=this.tabIndex,this.tabIndex=-1):"disabled"!==t||this.hasAttribute("disabled")||(this.tabIndex=this._prevTabindex)}}qt([dt({type:Boolean,reflect:!0})],Ht.prototype,"focused",void 0);var Kt=function(t,e,s,i){for(var o,r=arguments.length,n=r<3?e:null===i?i=Object.getOwnPropertyDescriptor(e,s):i,a=t.length-1;a>=0;a--)(o=t[a])&&(n=(r<3?o(n):r>3?o(e,s,n):o(e,s))||n);return r>3&&n&&Object.defineProperty(e,s,n),n};const Wt=t=>{class e extends t{constructor(){super(...arguments),this._label="",this._slottedText=""}set label(t){this._label=t,""===this._slottedText&&this.setAttribute("aria-label",t)}get label(){return this._label}_handleSlotChange(){this._slottedText=this.textContent?this.textContent.trim():"",""!==this._slottedText&&this.setAttribute("aria-label",this._slottedText)}_renderLabelAttribute(){return""===this._slottedText?L`<span class="label-attr">${this._label}</span>`:L`${q}`}}return Kt([dt()],e.prototype,"label",null),e};var Gt=[n`
    :host {
      color: var(--vscode-foreground, #cccccc);
      display: inline-block;
      font-family: var(--vscode-font-family, sans-serif);
      font-size: var(--vscode-font-size, 13px);
      font-weight: var(--vscode-font-weight, normal);
      line-height: 18px;
    }

    :host(:focus) {
      outline: none;
    }

    :host([disabled]) {
      opacity: 0.4;
    }

    .wrapper {
      cursor: pointer;
      display: block;
      font-size: var(--vscode-font-size, 13px);
      margin-bottom: 4px;
      margin-top: 4px;
      min-height: 18px;
      position: relative;
      user-select: none;
    }

    :host([disabled]) .wrapper {
      cursor: default;
    }

    input {
      position: absolute;
      height: 1px;
      left: 9px;
      margin: 0;
      top: 17px;
      width: 1px;
      overflow: hidden;
      clip: rect(1px, 1px, 1px, 1px);
      white-space: nowrap;
    }

    .icon {
      align-items: center;
      background-color: var(--vscode-settings-checkboxBackground, #313131);
      background-size: 16px;
      border: 1px solid var(--vscode-settings-checkboxBorder, #3c3c3c);
      box-sizing: border-box;
      color: var(--vscode-settings-checkboxForeground, #cccccc);
      display: flex;
      height: 18px;
      justify-content: center;
      left: 0;
      margin-left: 0;
      margin-right: 9px;
      padding: 0;
      pointer-events: none;
      position: absolute;
      top: 0;
      width: 18px;
    }

    .icon.before-empty-label {
      margin-right: 0;
    }

    .label {
      cursor: pointer;
      display: block;
      min-height: 18px;
      min-width: 18px;
    }

    .label-inner {
      display: block;
      opacity: 0.9;
      padding-left: 27px;
    }

    .label-inner.empty {
      padding-left: 0;
    }

    :host([disabled]) .label {
      cursor: default;
    }
  `];const Jt=[wt,Gt,n`
    :host(:invalid) .icon,
    :host([invalid]) .icon {
      background-color: var(--vscode-inputValidation-errorBackground, #5a1d1d);
      border-color: var(--vscode-inputValidation-errorBorder, #be1100);
    }

    .icon {
      border-radius: 3px;
    }

    .indeterminate-icon {
      background-color: currentColor;
      position: absolute;
      height: 1px;
      width: 12px;
    }

    :host(:focus):host(:not([disabled])) .icon {
      outline: 1px solid var(--vscode-focusBorder, #0078d4);
      outline-offset: -1px;
    }
  `];var Yt=function(t,e,s,i){for(var o,r=arguments.length,n=r<3?e:null===i?i=Object.getOwnPropertyDescriptor(e,s):i,a=t.length-1;a>=0;a--)(o=t[a])&&(n=(r<3?o(n):r>3?o(e,s,n):o(e,s))||n);return r>3&&n&&Object.defineProperty(e,s,n),n};let Xt=class extends(Wt(Ht)){set checked(t){this._checked=t,this._manageRequired(),this.requestUpdate()}get checked(){return this._checked}set required(t){this._required=t,this._manageRequired(),this.requestUpdate()}get required(){return this._required}get form(){return this._internals.form}get validity(){return this._internals.validity}get validationMessage(){return this._internals.validationMessage}get willValidate(){return this._internals.willValidate}checkValidity(){return this._internals.checkValidity()}reportValidity(){return this._internals.reportValidity()}constructor(){super(),this.autofocus=!1,this._checked=!1,this.defaultChecked=!1,this.invalid=!1,this.name=void 0,this.value="",this.disabled=!1,this.indeterminate=!1,this._required=!1,this.type="checkbox",this._handleClick=t=>{t.preventDefault(),this.disabled||this._toggleState()},this._handleKeyDown=t=>{this.disabled||"Enter"!==t.key&&" "!==t.key||(t.preventDefault()," "===t.key&&this._toggleState(),"Enter"===t.key&&this._internals.form?.requestSubmit())},this._internals=this.attachInternals()}connectedCallback(){super.connectedCallback(),this.addEventListener("keydown",this._handleKeyDown),this.updateComplete.then((()=>{this._manageRequired(),this._setActualFormValue()}))}disconnectedCallback(){this.removeEventListener("keydown",this._handleKeyDown)}update(t){super.update(t),t.has("checked")&&(this.ariaChecked=this.checked?"true":"false")}formResetCallback(){this.checked=this.defaultChecked}formStateRestoreCallback(t,e){t&&(this.checked=!0)}_setActualFormValue(){let t="";t=this.checked?this.value?this.value:"on":null,this._internals.setFormValue(t)}_toggleState(){this.checked=!this.checked,this.indeterminate=!1,this._setActualFormValue(),this._manageRequired(),this.dispatchEvent(new Event("change",{bubbles:!0})),this.dispatchEvent(new CustomEvent("vsc-change",{detail:{checked:this.checked,label:this.label,value:this.value},bubbles:!0,composed:!0}))}_manageRequired(){!this.checked&&this.required?this._internals.setValidity({valueMissing:!0},"Please check this box if you want to proceed.",this._inputEl??void 0):this._internals.setValidity({})}render(){const t=Et({icon:!0,checked:this.checked,indeterminate:this.indeterminate}),e=Et({"label-inner":!0}),s=L`<svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      xmlns="http://www.w3.org/2000/svg"
      fill="currentColor"
      class="check-icon"
    >
      <path
        fill-rule="evenodd"
        clip-rule="evenodd"
        d="M14.431 3.323l-8.47 10-.79-.036-3.35-4.77.818-.574 2.978 4.24 8.051-9.506.764.646z"
      />
    </svg>`,i=this.checked&&!this.indeterminate?s:q,o=this.indeterminate?L`<span class="indeterminate-icon"></span>`:q;return L`
      <div class="wrapper">
        <input
          ?autofocus=${this.autofocus}
          id="input"
          class="checkbox"
          type="checkbox"
          ?checked=${this.checked}
          value=${this.value}
        >
        <div class=${t}>${o}${i}</div>
        <label for="input" class="label" @click=${this._handleClick}>
          <span class=${e}>
            ${this._renderLabelAttribute()}
            <slot @slotchange=${this._handleSlotChange}></slot>
          </span>
        </label>
      </div>
    `}};Xt.styles=Jt,Xt.formAssociated=!0,Xt.shadowRootOptions={...at.shadowRootOptions,delegatesFocus:!0},Yt([dt({type:Boolean,reflect:!0})],Xt.prototype,"autofocus",void 0),Yt([dt({type:Boolean,reflect:!0})],Xt.prototype,"checked",null),Yt([dt({type:Boolean,reflect:!0,attribute:"default-checked"})],Xt.prototype,"defaultChecked",void 0),Yt([dt({type:Boolean,reflect:!0})],Xt.prototype,"invalid",void 0),Yt([dt({reflect:!0})],Xt.prototype,"name",void 0),Yt([dt()],Xt.prototype,"value",void 0),Yt([dt({type:Boolean,reflect:!0})],Xt.prototype,"disabled",void 0),Yt([dt({type:Boolean,reflect:!0})],Xt.prototype,"indeterminate",void 0),Yt([dt({type:Boolean,reflect:!0})],Xt.prototype,"required",null),Yt([dt()],Xt.prototype,"type",void 0),Yt([pt("#input")],Xt.prototype,"_inputEl",void 0),Xt=Yt([yt("vscode-checkbox")],Xt);const Zt=[wt,n`
    :host {
      display: block;
    }

    .wrapper {
      display: flex;
      flex-wrap: wrap;
    }

    :host([variant='vertical']) .wrapper {
      display: block;
    }

    ::slotted(vscode-checkbox) {
      margin-right: 20px;
    }

    ::slotted(vscode-checkbox:last-child) {
      margin-right: 0;
    }

    :host([variant='vertical']) ::slotted(vscode-checkbox) {
      display: block;
      margin-bottom: 15px;
    }

    :host([variant='vertical']) ::slotted(vscode-checkbox:last-child) {
      margin-bottom: 0;
    }
  `];var Qt=function(t,e,s,i){for(var o,r=arguments.length,n=r<3?e:null===i?i=Object.getOwnPropertyDescriptor(e,s):i,a=t.length-1;a>=0;a--)(o=t[a])&&(n=(r<3?o(n):r>3?o(e,s,n):o(e,s))||n);return r>3&&n&&Object.defineProperty(e,s,n),n};let te=class extends xt{constructor(){super(...arguments),this.role="group",this.variant="horizontal"}render(){return L`
      <div class="wrapper">
        <slot></slot>
      </div>
    `}};te.styles=Zt,Qt([dt({reflect:!0})],te.prototype,"role",void 0),Qt([dt({reflect:!0})],te.prototype,"variant",void 0),te=Qt([yt("vscode-checkbox-group")],te);const ee=[wt,n`
    .collapsible {
      background-color: var(--vscode-sideBar-background, #181818);
    }

    .collapsible-header {
      align-items: center;
      background-color: var(--vscode-sideBarSectionHeader-background, #181818);
      cursor: pointer;
      display: flex;
      height: 22px;
      line-height: 22px;
      user-select: none;
    }

    .collapsible-header:focus {
      opacity: 1;
      outline-offset: -1px;
      outline-style: solid;
      outline-width: 1px;
      outline-color: var(--vscode-focusBorder, #0078d4);
    }

    .title {
      color: var(--vscode-sideBarTitle-foreground, #cccccc);
      display: block;
      font-family: var(--vscode-font-family, sans-serif);
      font-size: 11px;
      font-weight: 700;
      margin: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      text-transform: uppercase;
      white-space: nowrap;
    }

    .title .description {
      font-weight: 400;
      margin-left: 10px;
      text-transform: none;
      opacity: 0.6;
    }

    .header-icon {
      color: var(--vscode-icon-foreground, #cccccc);
      display: block;
      flex-shrink: 0;
      margin: 0 3px;
    }

    .collapsible.open .header-icon {
      transform: rotate(90deg);
    }

    .header-slots {
      align-items: center;
      display: flex;
      height: 22px;
      margin-left: auto;
      margin-right: 4px;
    }

    .actions {
      display: none;
    }

    .collapsible.open .actions {
      display: block;
    }

    .header-slots slot {
      display: flex;
      max-height: 22px;
      overflow: hidden;
    }

    .header-slots slot::slotted(div) {
      align-items: center;
      display: flex;
    }

    .collapsible-body {
      display: none;
      overflow: hidden;
    }

    .collapsible.open .collapsible-body {
      display: block;
    }
  `];var se=function(t,e,s,i){for(var o,r=arguments.length,n=r<3?e:null===i?i=Object.getOwnPropertyDescriptor(e,s):i,a=t.length-1;a>=0;a--)(o=t[a])&&(n=(r<3?o(n):r>3?o(e,s,n):o(e,s))||n);return r>3&&n&&Object.defineProperty(e,s,n),n};let ie=class extends xt{constructor(){super(...arguments),this.title="",this.description="",this.open=!1}_emitToggleEvent(){this.dispatchEvent(new CustomEvent("vsc-collapsible-toggle",{detail:{open:this.open}}))}_onHeaderClick(){this.open=!this.open,this._emitToggleEvent()}_onHeaderKeyDown(t){"Enter"===t.key&&(this.open=!this.open,this._emitToggleEvent())}render(){const t=Et({collapsible:!0,open:this.open}),e=L`<svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      xmlns="http://www.w3.org/2000/svg"
      fill="currentColor"
      class="header-icon"
    >
      <path
        fill-rule="evenodd"
        clip-rule="evenodd"
        d="M10.072 8.024L5.715 3.667l.618-.62L11 7.716v.618L6.333 13l-.618-.619 4.357-4.357z"
      />
    </svg>`,s=this.description?L`<span class="description">${this.description}</span>`:q;return L`
      <div class=${t}>
        <div
          class="collapsible-header"
          tabindex="0"
          title=${this.title}
          @click=${this._onHeaderClick}
          @keydown=${this._onHeaderKeyDown}
        >
          ${e}
          <h3 class="title">${this.title}${s}</h3>
          <div class="header-slots">
            <div class="actions"><slot name="actions"></slot></div>
            <div class="decorations"><slot name="decorations"></slot></div>
          </div>
        </div>
        <div class="collapsible-body" part="body">
          <slot></slot>
        </div>
      </div>
    `}};ie.styles=ee,se([dt({type:String})],ie.prototype,"title",void 0),se([dt()],ie.prototype,"description",void 0),se([dt({type:Boolean,reflect:!0})],ie.prototype,"open",void 0),ie=se([yt("vscode-collapsible")],ie);const oe=[wt,n`
    :host {
      display: block;
      font-family: var(--vscode-font-family, sans-serif);
      font-size: var(--vscode-font-size, 13px);
      font-weight: var(--vscode-font-weight, normal);
      line-height: 1.4em;
      outline: none;
      position: relative;
    }

    .context-menu-item {
      background-color: var(--vscode-menu-background, #1f1f1f);
      color: var(--vscode-menu-foreground, #cccccc);
      display: flex;
      user-select: none;
      white-space: nowrap;
    }

    .ruler {
      border-bottom: 1px solid var(--vscode-menu-separatorBackground, #454545);
      display: block;
      margin: 0 0 4px;
      padding-top: 4px;
      width: 100%;
    }

    .context-menu-item a {
      align-items: center;
      border-color: transparent;
      border-radius: 3px;
      border-style: solid;
      border-width: 1px;
      box-sizing: border-box;
      color: var(--vscode-menu-foreground, #cccccc);
      cursor: pointer;
      display: flex;
      flex: 1 1 auto;
      height: 2em;
      margin-left: 4px;
      margin-right: 4px;
      outline: none;
      position: relative;
      text-decoration: inherit;
    }

    :host([selected]) .context-menu-item a {
      background-color: var(--vscode-menu-selectionBackground, #0078d4);
      border-color: var(--vscode-menu-selectionBorder, transparent);
      color: var(--vscode-menu-selectionForeground, #ffffff);
    }

    .label {
      background: none;
      display: flex;
      flex: 1 1 auto;
      font-size: 12px;
      line-height: 1;
      padding: 0 22px;
      text-decoration: none;
    }

    .keybinding {
      display: block;
      flex: 2 1 auto;
      line-height: 1;
      padding: 0 22px;
      text-align: right;
    }
  `];var re=function(t,e,s,i){for(var o,r=arguments.length,n=r<3?e:null===i?i=Object.getOwnPropertyDescriptor(e,s):i,a=t.length-1;a>=0;a--)(o=t[a])&&(n=(r<3?o(n):r>3?o(e,s,n):o(e,s))||n);return r>3&&n&&Object.defineProperty(e,s,n),n};let ne=class extends xt{constructor(){super(...arguments),this.label="",this.keybinding="",this.value="",this.separator=!1,this.tabindex=0}onItemClick(){this.dispatchEvent(new CustomEvent("vsc-click",{detail:{label:this.label,keybinding:this.keybinding,value:this.value||this.label,separator:this.separator,tabindex:this.tabindex},bubbles:!0,composed:!0}))}render(){return L`
      ${this.separator?L`
            <div class="context-menu-item separator">
              <span class="ruler"></span>
            </div>
          `:L`
            <div class="context-menu-item">
              <a @click=${this.onItemClick}>
                ${this.label?L`<span class="label">${this.label}</span>`:q}
                ${this.keybinding?L`<span class="keybinding">${this.keybinding}</span>`:q}
              </a>
            </div>
          `}
    `}};ne.styles=oe,re([dt({type:String})],ne.prototype,"label",void 0),re([dt({type:String})],ne.prototype,"keybinding",void 0),re([dt({type:String})],ne.prototype,"value",void 0),re([dt({type:Boolean,reflect:!0})],ne.prototype,"separator",void 0),re([dt({type:Number})],ne.prototype,"tabindex",void 0),ne=re([yt("vscode-context-menu-item")],ne);const ae=[wt,n`
    :host {
      display: block;
      font-family: var(--vscode-font-family, sans-serif);
      font-size: var(--vscode-font-size, 13px);
      font-weight: var(--vscode-font-weight, normal);
      line-height: 1.4em;
      position: relative;
    }

    .context-menu {
      background-color: var(--vscode-menu-background, #1f1f1f);
      border-color: var(--vscode-menu-border, #454545);
      border-radius: 5px;
      border-style: solid;
      border-width: 1px;
      box-shadow: 0 2px 8px var(--vscode-widget-shadow, rgba(0, 0, 0, 0.36));
      color: var(--vscode-menu-foreground, #cccccc);
      padding: 4px 0;
      white-space: nowrap;
    }

    .context-menu:focus {
      outline: 0;
    }
  `];var ce=function(t,e,s,i){for(var o,r=arguments.length,n=r<3?e:null===i?i=Object.getOwnPropertyDescriptor(e,s):i,a=t.length-1;a>=0;a--)(o=t[a])&&(n=(r<3?o(n):r>3?o(e,s,n):o(e,s))||n);return r>3&&n&&Object.defineProperty(e,s,n),n};let le=class extends xt{set data(t){this._data=t;const e=[];t.forEach(((t,s)=>{t.separator||e.push(s)})),this._clickableItemIndexes=e}get data(){return this._data}set show(t){this._show=t,this._selectedClickableItemIndex=-1,t&&this.updateComplete.then((()=>{this._wrapperEl&&this._wrapperEl.focus(),requestAnimationFrame((()=>{document.addEventListener("click",this._onClickOutsideBound,{once:!0})}))}))}get show(){return this._show}constructor(){super(),this.preventClose=!1,this.tabIndex=0,this._selectedClickableItemIndex=-1,this._show=!1,this._data=[],this._clickableItemIndexes=[],this._onClickOutsideBound=this._onClickOutside.bind(this),this.addEventListener("keydown",this._onKeyDown)}_onClickOutside(t){t.composedPath().includes(this)||(this.show=!1)}_onKeyDown(t){const{key:e}=t;switch("ArrowUp"!==e&&"ArrowDown"!==e&&"Escape"!==e&&"Enter"!==e||t.preventDefault(),e){case"ArrowUp":this._handleArrowUp();break;case"ArrowDown":this._handleArrowDown();break;case"Escape":this._handleEscape();break;case"Enter":this._handleEnter()}}_handleArrowUp(){0===this._selectedClickableItemIndex?this._selectedClickableItemIndex=this._clickableItemIndexes.length-1:this._selectedClickableItemIndex-=1}_handleArrowDown(){this._selectedClickableItemIndex+1<this._clickableItemIndexes.length?this._selectedClickableItemIndex+=1:this._selectedClickableItemIndex=0}_handleEscape(){this.show=!1,document.removeEventListener("click",this._onClickOutsideBound)}_dispatchSelectEvent(t){const{keybinding:e,label:s,value:i,separator:o,tabindex:r}=t;this.dispatchEvent(new CustomEvent("vsc-context-menu-select",{detail:{keybinding:e,label:s,separator:o,tabindex:r,value:i}}))}_dispatchLegacySelectEvent(t){const{keybinding:e,label:s,value:i,separator:o,tabindex:r}=t,n={keybinding:e,label:s,value:i,separator:o,tabindex:r};this.dispatchEvent(new CustomEvent("vsc-select",{detail:n,bubbles:!0,composed:!0}))}_handleEnter(){if(-1===this._selectedClickableItemIndex)return;const t=this._clickableItemIndexes[this._selectedClickableItemIndex],e=this._wrapperEl.querySelectorAll("vscode-context-menu-item")[t];this._dispatchLegacySelectEvent(e),this._dispatchSelectEvent(e),this.preventClose||(this.show=!1,document.removeEventListener("click",this._onClickOutsideBound))}_onItemClick(t){const e=t.currentTarget;this._dispatchLegacySelectEvent(e),this._dispatchSelectEvent(e),this.preventClose||(this.show=!1)}_onItemMouseOver(t){const e=t.target,s=e.dataset.index?+e.dataset.index:-1,i=this._clickableItemIndexes.findIndex((t=>t===s));-1!==i&&(this._selectedClickableItemIndex=i)}_onItemMouseOut(){this._selectedClickableItemIndex=-1}render(){if(!this._show)return L`${q}`;const t=this._clickableItemIndexes[this._selectedClickableItemIndex];return L`
      <div class="context-menu" tabindex="0">
        ${this.data?this.data.map((({label:e="",keybinding:s="",value:i="",separator:o=!1,tabindex:r=0},n)=>L`
                <vscode-context-menu-item
                  label=${e}
                  keybinding=${s}
                  value=${i}
                  ?separator=${o}
                  ?selected=${n===t}
                  tabindex=${r}
                  @vsc-click=${this._onItemClick}
                  @mouseover=${this._onItemMouseOver}
                  @mouseout=${this._onItemMouseOut}
                  data-index=${n}
                ></vscode-context-menu-item>
              `)):L`<slot></slot>`}
      </div>
    `}};le.styles=ae,ce([dt({type:Array,attribute:!1})],le.prototype,"data",null),ce([dt({type:Boolean,reflect:!0,attribute:"prevent-close"})],le.prototype,"preventClose",void 0),ce([dt({type:Boolean,reflect:!0})],le.prototype,"show",null),ce([dt({type:Number,reflect:!0})],le.prototype,"tabIndex",void 0),ce([ut()],le.prototype,"_selectedClickableItemIndex",void 0),ce([ut()],le.prototype,"_show",void 0),ce([pt(".context-menu")],le.prototype,"_wrapperEl",void 0),le=ce([yt("vscode-context-menu")],le);const he=[wt,n`
    :host {
      background-color: var(--vscode-foreground, #cccccc);
      display: block;
      height: 1px;
      margin-bottom: 10px;
      margin-top: 10px;
      opacity: 0.4;
    }
  `];var de=function(t,e,s,i){for(var o,r=arguments.length,n=r<3?e:null===i?i=Object.getOwnPropertyDescriptor(e,s):i,a=t.length-1;a>=0;a--)(o=t[a])&&(n=(r<3?o(n):r>3?o(e,s,n):o(e,s))||n);return r>3&&n&&Object.defineProperty(e,s,n),n};let ue=class extends xt{constructor(){super(...arguments),this.role="separator"}render(){return L``}};ue.styles=he,de([dt({reflect:!0})],ue.prototype,"role",void 0),ue=de([yt("vscode-divider")],ue);const ve=[wt,n`
    :host {
      display: block;
      max-width: 727px;
    }
  `];var pe,be=function(t,e,s,i){for(var o,r=arguments.length,n=r<3?e:null===i?i=Object.getOwnPropertyDescriptor(e,s):i,a=t.length-1;a>=0;a--)(o=t[a])&&(n=(r<3?o(n):r>3?o(e,s,n):o(e,s))||n);return r>3&&n&&Object.defineProperty(e,s,n),n};!function(t){t.HORIZONTAL="horizontal",t.VERTICAL="vertical"}(pe||(pe={}));const fe=t=>"vscode-checkbox"===t.tagName.toLocaleLowerCase(),ge=t=>"vscode-radio"===t.tagName.toLocaleLowerCase();let me=class extends xt{constructor(){super(...arguments),this.breakpoint=490,this._responsive=!1,this._firstUpdateComplete=!1,this._resizeObserverCallbackBound=this._resizeObserverCallback.bind(this)}set responsive(t){this._responsive=t,this._firstUpdateComplete&&(t?this._activateResponsiveLayout():this._deactivateResizeObserver())}get responsive(){return this._responsive}get data(){return this._collectFormData()}_collectFormData(){const t=["vscode-textfield","vscode-textarea","vscode-single-select","vscode-multi-select","vscode-checkbox","vscode-radio"].join(","),e=this.querySelectorAll(t),s={};return e.forEach((t=>{if(!t.hasAttribute("name"))return;const e=t.getAttribute("name");e&&(fe(t)&&t.checked?s[e]=Array.isArray(s[e])?[...s[e],t.value]:[t.value]:"vscode-multi-select"===t.tagName.toLocaleLowerCase()?s[e]=t.value:fe(t)&&!t.checked?s[e]=Array.isArray(s[e])?s[e]:[]:ge(t)&&t.checked||(t=>["vscode-textfield","vscode-textarea"].includes(t.tagName.toLocaleLowerCase()))(t)||(t=>"vscode-single-select"===t.tagName.toLocaleLowerCase())(t)?s[e]=t.value:ge(t)&&!t.checked&&(s[e]=s[e]?s[e]:""))})),s}_toggleCompactLayout(t){this._assignedFormGroups.forEach((e=>{e.dataset.originalVariant||(e.dataset.originalVariant=e.variant);const s=e.dataset.originalVariant;t===pe.VERTICAL&&"horizontal"===s?e.variant="vertical":e.variant=s;e.querySelectorAll("vscode-checkbox-group, vscode-radio-group").forEach((e=>{e.dataset.originalVariant||(e.dataset.originalVariant=e.variant);const s=e.dataset.originalVariant;t===pe.HORIZONTAL&&s===pe.HORIZONTAL?e.variant="horizontal":e.variant="vertical"}))}))}_resizeObserverCallback(t){let e=0;for(const s of t)e=s.contentRect.width;const s=e<this.breakpoint?pe.VERTICAL:pe.HORIZONTAL;s!==this._currentFormGroupLayout&&(this._toggleCompactLayout(s),this._currentFormGroupLayout=s)}_activateResponsiveLayout(){this._resizeObserver=new ResizeObserver(this._resizeObserverCallbackBound),this._resizeObserver.observe(this._wrapperElement)}_deactivateResizeObserver(){this._resizeObserver?.disconnect(),this._resizeObserver=null}firstUpdated(){this._firstUpdateComplete=!0,this._responsive&&this._activateResponsiveLayout()}render(){return L`
      <div class="wrapper">
        <slot></slot>
      </div>
    `}};me.styles=ve,be([dt({type:Boolean,reflect:!0})],me.prototype,"responsive",null),be([dt({type:Number})],me.prototype,"breakpoint",void 0),be([dt({type:Object})],me.prototype,"data",null),be([pt(".wrapper")],me.prototype,"_wrapperElement",void 0),be([ft({selector:"vscode-form-group"})],me.prototype,"_assignedFormGroups",void 0),me=be([yt("vscode-form-container")],me);const xe=[wt,n`
    :host {
      --label-right-margin: 14px;
      --label-width: 150px;

      display: block;
      margin: 15px 0;
    }

    :host([variant='settings-group']) {
      margin: 0;
      padding: 12px 14px 18px;
      max-width: 727px;
    }

    .wrapper {
      display: flex;
      flex-wrap: wrap;
    }

    :host([variant='vertical']) .wrapper,
    :host([variant='settings-group']) .wrapper {
      display: block;
    }

    :host([variant='horizontal']) ::slotted(vscode-checkbox-group),
    :host([variant='horizontal']) ::slotted(vscode-radio-group) {
      width: calc(100% - calc(var(--label-width) + var(--label-right-margin)));
    }

    :host([variant='horizontal']) ::slotted(vscode-label) {
      margin-right: var(--label-right-margin);
      text-align: right;
      width: var(--label-width);
    }

    :host([variant='settings-group']) ::slotted(vscode-label) {
      height: 18px;
      line-height: 18px;
      margin-bottom: 4px;
      margin-right: 0;
      padding: 0;
    }

    ::slotted(vscode-form-helper) {
      margin-left: calc(var(--label-width) + var(--label-right-margin));
    }

    :host([variant='vertical']) ::slotted(vscode-form-helper),
    :host([variant='settings-group']) ::slotted(vscode-form-helper) {
      display: block;
      margin-left: 0;
    }

    :host([variant='settings-group']) ::slotted(vscode-form-helper) {
      margin-bottom: 0;
      margin-top: 0;
    }

    :host([variant='vertical']) ::slotted(vscode-label),
    :host([variant='settings-group']) ::slotted(vscode-label) {
      display: block;
      margin-left: 0;
      text-align: left;
    }

    :host([variant='settings-group']) ::slotted(vscode-inputbox),
    :host([variant='settings-group']) ::slotted(vscode-textfield),
    :host([variant='settings-group']) ::slotted(vscode-textarea),
    :host([variant='settings-group']) ::slotted(vscode-single-select),
    :host([variant='settings-group']) ::slotted(vscode-multi-select) {
      margin-top: 9px;
    }

    ::slotted(vscode-button:first-child) {
      margin-left: calc(var(--label-width) + var(--label-right-margin));
    }

    :host([variant='vertical']) ::slotted(vscode-button) {
      margin-left: 0;
    }

    ::slotted(vscode-button) {
      margin-right: 4px;
    }
  `];var ye=function(t,e,s,i){for(var o,r=arguments.length,n=r<3?e:null===i?i=Object.getOwnPropertyDescriptor(e,s):i,a=t.length-1;a>=0;a--)(o=t[a])&&(n=(r<3?o(n):r>3?o(e,s,n):o(e,s))||n);return r>3&&n&&Object.defineProperty(e,s,n),n};let we=class extends xt{constructor(){super(...arguments),this.variant="horizontal"}render(){return L`
      <div class="wrapper">
        <slot></slot>
      </div>
    `}};we.styles=xe,ye([dt({reflect:!0})],we.prototype,"variant",void 0),we=ye([yt("vscode-form-group")],we);const ke=[wt,n`
    :host {
      display: block;
      line-height: 1.4em;
      margin-bottom: 4px;
      margin-top: 4px;
      max-width: 720px;
      opacity: 0.9;
    }

    :host([vertical]) {
      margin-left: 0;
    }
  `];var $e=function(t,e,s,i){for(var o,r=arguments.length,n=r<3?e:null===i?i=Object.getOwnPropertyDescriptor(e,s):i,a=t.length-1;a>=0;a--)(o=t[a])&&(n=(r<3?o(n):r>3?o(e,s,n):o(e,s))||n);return r>3&&n&&Object.defineProperty(e,s,n),n};const _e=new CSSStyleSheet;_e.replaceSync("\n  vscode-form-helper * {\n    margin: 0;\n  }\n\n  vscode-form-helper *:not(:last-child) {\n    margin-bottom: 8px;\n  }\n");let Ce=class extends xt{constructor(){super(),this._injectLightDOMStyles()}_injectLightDOMStyles(){const t=document.adoptedStyleSheets.find((t=>t===_e));t||document.adoptedStyleSheets.push(_e)}render(){return L`<slot></slot>`}};Ce.styles=ke,Ce=$e([yt("vscode-form-helper")],Ce);let Be=0;const Se=(t="")=>(Be++,`${t}${Be}`),ze=[wt,n`
    :host {
      display: block;
    }

    .wrapper {
      display: flex;
      flex-wrap: wrap;
    }

    :host([variant='vertical']) .wrapper {
      display: block;
    }

    ::slotted(vscode-radio) {
      margin-right: 20px;
    }

    ::slotted(vscode-radio:last-child) {
      margin-right: 0;
    }

    :host([variant='vertical']) ::slotted(vscode-radio) {
      display: block;
      margin-bottom: 15px;
    }

    :host([variant='vertical']) ::slotted(vscode-radio:last-child) {
      margin-bottom: 0;
    }
  `];var Oe=function(t,e,s,i){for(var o,r=arguments.length,n=r<3?e:null===i?i=Object.getOwnPropertyDescriptor(e,s):i,a=t.length-1;a>=0;a--)(o=t[a])&&(n=(r<3?o(n):r>3?o(e,s,n):o(e,s))||n);return r>3&&n&&Object.defineProperty(e,s,n),n};let Ae=class extends xt{constructor(){super(...arguments),this.variant="horizontal",this.role="radiogroup",this._focusedRadio=-1,this._checkedRadio=-1,this._firstContentLoaded=!1,this._onKeyDownBound=this._onKeyDown.bind(this)}connectedCallback(){super.connectedCallback(),this.addEventListener("keydown",this._onKeyDownBound)}disconnectedCallback(){super.disconnectedCallback(),this.removeEventListener("keydown",this._onKeyDownBound)}_uncheckPreviousChecked(t,e){-1!==t&&(this._radios[t].checked=!1),-1!==e&&(this._radios[e].tabIndex=-1)}_afterCheck(){this._focusedRadio=this._checkedRadio,this._radios[this._checkedRadio].checked=!0,this._radios[this._checkedRadio].tabIndex=0,this._radios[this._checkedRadio].focus()}_checkPrev(){const t=this._radios.findIndex((t=>t.checked)),e=this._radios.findIndex((t=>t.focused)),s=-1!==e?e:t;this._uncheckPreviousChecked(t,e),this._checkedRadio=-1===s?this._radios.length-1:s-1>=0?s-1:this._radios.length-1,this._afterCheck()}_checkNext(){const t=this._radios.findIndex((t=>t.checked)),e=this._radios.findIndex((t=>t.focused)),s=-1!==e?e:t;this._uncheckPreviousChecked(t,e),-1===s?this._checkedRadio=0:s+1<this._radios.length?this._checkedRadio=s+1:this._checkedRadio=0,this._afterCheck()}_onKeyDown(t){const{key:e}=t;["ArrowLeft","ArrowUp","ArrowRight","ArrowDown"].includes(e)&&t.preventDefault(),"ArrowRight"!==e&&"ArrowDown"!==e||this._checkNext(),"ArrowLeft"!==e&&"ArrowUp"!==e||this._checkPrev()}_onChange(t){const e=this._radios.findIndex((e=>e===t.target));-1!==e&&(-1!==this._focusedRadio&&(this._radios[this._focusedRadio].tabIndex=-1),-1!==this._checkedRadio&&this._checkedRadio!==e&&(this._radios[this._checkedRadio].checked=!1),this._focusedRadio=e,this._checkedRadio=e,this._radios[e].tabIndex=0)}_onSlotChange(){if(!this._firstContentLoaded){const t=this._radios.findIndex((t=>t.autofocus));t>-1&&(this._focusedRadio=t),this._firstContentLoaded=!0}this._radios.forEach(((t,e)=>{this._focusedRadio>-1?t.tabIndex=e===this._focusedRadio?0:-1:t.tabIndex=0===e?0:-1}))}render(){return L`
      <div class="wrapper">
        <slot
          @slotchange=${this._onSlotChange}
          @vsc-change=${this._onChange}
        ></slot>
      </div>
    `}};Ae.styles=ze,Oe([dt({reflect:!0})],Ae.prototype,"variant",void 0),Oe([dt({reflect:!0})],Ae.prototype,"role",void 0),Oe([ft({selector:"vscode-radio"})],Ae.prototype,"_radios",void 0),Oe([ut()],Ae.prototype,"_focusedRadio",void 0),Oe([ut()],Ae.prototype,"_checkedRadio",void 0),Ae=Oe([yt("vscode-radio-group")],Ae);const Ee=[wt,n`
    :host {
      display: inline-block;
      height: 40px;
      position: relative;
      width: 320px;
    }

    :host([cols]) {
      width: auto;
    }

    :host([rows]) {
      height: auto;
    }

    .shadow {
      box-shadow: var(--vscode-scrollbar-shadow, #000000) 0 6px 6px -6px inset;
      display: none;
      inset: 0 0 auto 0;
      height: 6px;
      pointer-events: none;
      position: absolute;
      width: 100%;
    }

    .shadow.visible {
      display: block;
    }

    textarea {
      background-color: var(--vscode-settings-textInputBackground, #313131);
      border-color: var(--vscode-settings-textInputBorder, transparent);
      border-radius: 2px;
      border-style: solid;
      border-width: 1px;
      box-sizing: border-box;
      color: var(--vscode-settings-textInputForeground, #cccccc);
      display: block;
      font-family: var(--vscode-font-family, sans-serif);
      font-size: var(--vscode-font-size, 13px);
      font-weight: var(--vscode-font-weight, normal);
      height: 100%;
      width: 100%;
    }

    :host([cols]) textarea {
      width: auto;
    }

    :host([rows]) textarea {
      height: auto;
    }

    :host([invalid]) textarea,
    :host(:invalid) textarea {
      background-color: var(--vscode-inputValidation-errorBackground, #5a1d1d);
      border-color: var(--vscode-inputValidation-errorBorder, #be1100);
    }

    textarea.monospace {
      background-color: var(--vscode-editor-background, #1f1f1f);
      color: var(--vscode-editor-foreground, #cccccc);
      font-family: var(--vscode-editor-font-family, monospace);
      font-size: var(--vscode-editor-font-size, 14px);
      font-weight: var(--vscode-editor-font-weight, normal);
    }

    .textarea.monospace::placeholder {
      color: var(
        --vscode-editor-inlineValuesForeground,
        rgba(255, 255, 255, 0.5)
      );
    }

    textarea.cursor-pointer {
      cursor: pointer;
    }

    textarea:focus {
      border-color: var(--vscode-focusBorder, #0078d4);
      outline: none;
    }

    textarea::placeholder {
      color: var(--vscode-input-placeholderForeground, #989898);
      opacity: 1;
    }

    textarea::-webkit-scrollbar-track {
      background-color: transparent;
    }

    textarea::-webkit-scrollbar {
      width: 14px;
    }

    textarea::-webkit-scrollbar-thumb {
      background-color: transparent;
    }

    textarea:hover::-webkit-scrollbar-thumb {
      background-color: var(
        --vscode-scrollbarSlider-background,
        rgba(121, 121, 121, 0.4)
      );
    }

    textarea::-webkit-scrollbar-thumb:hover {
      background-color: var(
        --vscode-scrollbarSlider-hoverBackground,
        rgba(100, 100, 100, 0.7)
      );
    }

    textarea::-webkit-scrollbar-thumb:active {
      background-color: var(
        --vscode-scrollbarSlider-activeBackground,
        rgba(191, 191, 191, 0.4)
      );
    }

    textarea::-webkit-scrollbar-corner {
      background-color: transparent;
    }

    textarea::-webkit-resizer {
      background-image: url('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAcAAAAHCAYAAADEUlfTAAAAAXNSR0IB2cksfwAAAAlwSFlzAAALEwAACxMBAJqcGAAAACJJREFUeJxjYMAOZuIQZ5j5//9/rJJESczEKYGsG6cEXgAAsEEefMxkua4AAAAASUVORK5CYII=');
      background-repeat: no-repeat;
      background-position: right bottom;
    }
  `];var je=function(t,e,s,i){for(var o,r=arguments.length,n=r<3?e:null===i?i=Object.getOwnPropertyDescriptor(e,s):i,a=t.length-1;a>=0;a--)(o=t[a])&&(n=(r<3?o(n):r>3?o(e,s,n):o(e,s))||n);return r>3&&n&&Object.defineProperty(e,s,n),n};let Ie=class extends xt{set value(t){this._value=t,this._internals.setFormValue(t)}get value(){return this._value}get wrappedElement(){return this._textareaEl}get form(){return this._internals.form}get type(){return"textarea"}get validity(){return this._internals.validity}get validationMessage(){return this._internals.validationMessage}get willValidate(){return this._internals.willValidate}set minlength(t){this.minLength=t}get minlength(){return this.minLength}set maxlength(t){this.maxLength=t}get maxlength(){return this.maxLength}constructor(){super(),this.autocomplete=void 0,this.autofocus=!1,this.defaultValue="",this.disabled=!1,this.invalid=!1,this.label="",this.maxLength=void 0,this.minLength=void 0,this.rows=void 0,this.cols=void 0,this.name=void 0,this.placeholder=void 0,this.readonly=!1,this.resize="none",this.required=!1,this.spellcheck=!1,this.monospace=!1,this._value="",this._textareaPointerCursor=!1,this._shadow=!1,this._internals=this.attachInternals()}connectedCallback(){super.connectedCallback(),this.updateComplete.then((()=>{this._textareaEl.checkValidity(),this._setValidityFromInput(),this._internals.setFormValue(this._textareaEl.value)}))}updated(t){const e=["maxLength","minLength","required"];for(const s of t.keys())if(e.includes(String(s))){this.updateComplete.then((()=>{this._setValidityFromInput()}));break}}formResetCallback(){this.value=this.defaultValue}formStateRestoreCallback(t,e){this.updateComplete.then((()=>{this._value=t}))}checkValidity(){return this._internals.checkValidity()}reportValidity(){return this._internals.reportValidity()}_setValidityFromInput(){this._internals.setValidity(this._textareaEl.validity,this._textareaEl.validationMessage,this._textareaEl)}_dataChanged(){this._value=this._textareaEl.value,this._internals.setFormValue(this._textareaEl.value)}_handleChange(t){this._dataChanged(),this._setValidityFromInput(),this.dispatchEvent(new Event("change")),this.dispatchEvent(new CustomEvent("vsc-change",{detail:{data:this.value,originalEvent:t}}))}_handleInput(t){this._dataChanged(),this._setValidityFromInput(),this.dispatchEvent(new CustomEvent("vsc-input",{detail:{data:t.data,originalEvent:t}}))}_handleMouseMove(t){if(this._textareaEl.clientHeight>=this._textareaEl.scrollHeight)return void(this._textareaPointerCursor=!1);const e=this._textareaEl.getBoundingClientRect(),s=t.clientX;this._textareaPointerCursor=s>=e.left+e.width-14-2}_handleScroll(){this._shadow=this._textareaEl.scrollTop>0}render(){return L`
      <div
        class=${Et({shadow:!0,visible:this._shadow})}
      ></div>
      <textarea
        autocomplete=${jt(this.autocomplete)}
        ?autofocus=${this.autofocus}
        ?disabled=${this.disabled}
        aria-label=${this.label}
        id="textarea"
        class=${Et({monospace:this.monospace,"cursor-pointer":this._textareaPointerCursor})}
        maxlength=${jt(this.maxLength)}
        minlength=${jt(this.minLength)}
        rows=${jt(this.rows)}
        cols=${jt(this.cols)}
        name=${jt(this.name)}
        placeholder=${jt(this.placeholder)}
        ?readonly=${this.readonly}
        .style=${It({resize:this.resize})}
        ?required=${this.required}
        spellcheck=${this.spellcheck}
        @change=${this._handleChange}
        @input=${this._handleInput}
        @mousemove=${this._handleMouseMove}
        @scroll=${this._handleScroll}
        .value=${this._value}
      ></textarea>
    `}};Ie.styles=Ee,Ie.formAssociated=!0,Ie.shadowRootOptions={...at.shadowRootOptions,delegatesFocus:!0},je([dt()],Ie.prototype,"autocomplete",void 0),je([dt({type:Boolean,reflect:!0})],Ie.prototype,"autofocus",void 0),je([dt({attribute:"default-value"})],Ie.prototype,"defaultValue",void 0),je([dt({type:Boolean,reflect:!0})],Ie.prototype,"disabled",void 0),je([dt({type:Boolean,reflect:!0})],Ie.prototype,"invalid",void 0),je([dt({attribute:!1})],Ie.prototype,"label",void 0),je([dt({type:Number})],Ie.prototype,"maxLength",void 0),je([dt({type:Number})],Ie.prototype,"minLength",void 0),je([dt({type:Number})],Ie.prototype,"rows",void 0),je([dt({type:Number})],Ie.prototype,"cols",void 0),je([dt()],Ie.prototype,"name",void 0),je([dt()],Ie.prototype,"placeholder",void 0),je([dt({type:Boolean,reflect:!0})],Ie.prototype,"readonly",void 0),je([dt()],Ie.prototype,"resize",void 0),je([dt({type:Boolean,reflect:!0})],Ie.prototype,"required",void 0),je([dt({type:Boolean})],Ie.prototype,"spellcheck",void 0),je([dt({type:Boolean,reflect:!0})],Ie.prototype,"monospace",void 0),je([dt()],Ie.prototype,"value",null),je([pt("#textarea")],Ie.prototype,"_textareaEl",void 0),je([ut()],Ie.prototype,"_value",void 0),je([ut()],Ie.prototype,"_textareaPointerCursor",void 0),je([ut()],Ie.prototype,"_shadow",void 0),Ie=je([yt("vscode-textarea")],Ie);const Me=r(kt()),Fe=[wt,n`
    :host {
      align-items: center;
      background-color: var(--vscode-settings-textInputBackground, #313131);
      border-color: var(
        --vscode-settings-textInputBorder,
        var(--vscode-settings-textInputBackground, #3c3c3c)
      );
      border-radius: 2px;
      border-style: solid;
      border-width: 1px;
      box-sizing: border-box;
      color: var(--vscode-settings-textInputForeground, #cccccc);
      display: inline-flex;
      max-width: 100%;
      position: relative;
      width: 320px;
    }

    :host([focused]) {
      border-color: var(--vscode-focusBorder, #0078d4);
    }

    :host([invalid]),
    :host(:invalid) {
      border-color: var(--vscode-inputValidation-errorBorder, #be1100);
    }

    :host([invalid]) input,
    :host(:invalid) input {
      background-color: var(--vscode-inputValidation-errorBackground, #5a1d1d);
    }

    ::slotted([slot='content-before']) {
      display: block;
      margin-left: 2px;
    }

    ::slotted([slot='content-after']) {
      display: block;
      margin-right: 2px;
    }

    slot[name='content-before'],
    slot[name='content-after'] {
      align-items: center;
      display: flex;
    }

    input {
      background-color: var(--vscode-settings-textInputBackground, #313131);
      border: 0;
      box-sizing: border-box;
      color: var(--vscode-settings-textInputForeground, #cccccc);
      display: block;
      font-family: var(--vscode-font-family, ${Me});
      font-size: var(--vscode-font-size, 13px);
      font-weight: var(--vscode-font-weight, 'normal');
      line-height: 18px;
      outline: none;
      padding-bottom: 3px;
      padding-left: 4px;
      padding-right: 4px;
      padding-top: 3px;
      width: 100%;
    }

    input:read-only:not([type='file']) {
      cursor: not-allowed;
    }

    input::placeholder {
      color: var(--vscode-input-placeholderForeground, #989898);
      opacity: 1;
    }

    input[type='file'] {
      line-height: 24px;
      padding-bottom: 0;
      padding-left: 2px;
      padding-top: 0;
    }

    input[type='file']::file-selector-button {
      background-color: var(--vscode-button-background, #0078d4);
      border: 0;
      border-radius: 2px;
      color: var(--vscode-button-foreground, #ffffff);
      cursor: pointer;
      font-family: var(--vscode-font-family, ${Me});
      font-size: var(--vscode-font-size, 13px);
      font-weight: var(--vscode-font-weight, 'normal');
      line-height: 20px;
      padding: 0 14px;
    }

    input[type='file']::file-selector-button:hover {
      background-color: var(--vscode-button-hoverBackground, #026ec1);
    }
  `];var Pe=function(t,e,s,i){for(var o,r=arguments.length,n=r<3?e:null===i?i=Object.getOwnPropertyDescriptor(e,s):i,a=t.length-1;a>=0;a--)(o=t[a])&&(n=(r<3?o(n):r>3?o(e,s,n):o(e,s))||n);return r>3&&n&&Object.defineProperty(e,s,n),n};let Ne=class extends xt{set type(t){this._type=["color","date","datetime-local","email","file","month","number","password","search","tel","text","time","url","week"].includes(t)?t:"text"}get type(){return this._type}set value(t){"file"!==this.type&&(this._value=t,this._internals.setFormValue(t)),this.updateComplete.then((()=>{this._setValidityFromInput()}))}get value(){return this._value}set minlength(t){this.minLength=t}get minlength(){return this.minLength}set maxlength(t){this.maxLength=t}get maxlength(){return this.maxLength}get form(){return this._internals.form}get validity(){return this._internals.validity}get validationMessage(){return this._internals.validationMessage}get willValidate(){return this._internals.willValidate}checkValidity(){return this._setValidityFromInput(),this._internals.checkValidity()}reportValidity(){return this._setValidityFromInput(),this._internals.reportValidity()}get wrappedElement(){return this._inputEl}constructor(){super(),this.autocomplete=void 0,this.autofocus=!1,this.defaultValue="",this.disabled=!1,this.focused=!1,this.invalid=!1,this.label="",this.max=void 0,this.maxLength=void 0,this.min=void 0,this.minLength=void 0,this.multiple=!1,this.name=void 0,this.pattern=void 0,this.placeholder=void 0,this.readonly=!1,this.required=!1,this.step=void 0,this._value="",this._type="text",this._internals=this.attachInternals()}connectedCallback(){super.connectedCallback(),this.updateComplete.then((()=>{this._inputEl.checkValidity(),this._setValidityFromInput(),this._internals.setFormValue(this._inputEl.value)}))}attributeChangedCallback(t,e,s){super.attributeChangedCallback(t,e,s);["max","maxlength","min","minlength","pattern","required","step"].includes(t)&&this.updateComplete.then((()=>{this._setValidityFromInput()}))}formResetCallback(){this.value=this.defaultValue,this.requestUpdate()}formStateRestoreCallback(t,e){this.value=t}_dataChanged(){if(this._value=this._inputEl.value,"file"===this.type&&this._inputEl.files)for(const t of this._inputEl.files)this._internals.setFormValue(t);else this._internals.setFormValue(this._inputEl.value)}_setValidityFromInput(){this._inputEl&&this._internals.setValidity(this._inputEl.validity,this._inputEl.validationMessage,this._inputEl)}_onInput(t){this._dataChanged(),this._setValidityFromInput(),this.dispatchEvent(new CustomEvent("vsc-input",{detail:{data:t.data,originalEvent:t}}))}_onChange(t){this._dataChanged(),this._setValidityFromInput(),this.dispatchEvent(new Event("change")),this.dispatchEvent(new CustomEvent("vsc-change",{detail:{data:this.value,originalEvent:t}}))}_onFocus(){this.focused=!0}_onBlur(){this.focused=!1}_onKeyDown(t){"Enter"===t.key&&this._internals.form&&this._internals.form?.requestSubmit()}render(){return L`
      <slot name="content-before"></slot>
      <input
        id="input"
        type=${this.type}
        ?autofocus=${this.autofocus}
        autocomplete=${jt(this.autocomplete)}
        aria-label=${this.label}
        ?disabled=${this.disabled}
        max=${jt(this.max)}
        maxlength=${jt(this.maxLength)}
        min=${jt(this.min)}
        minlength=${jt(this.minLength)}
        ?multiple=${this.multiple}
        name=${jt(this.name)}
        pattern=${jt(this.pattern)}
        placeholder=${jt(this.placeholder)}
        ?readonly=${this.readonly}
        ?required=${this.required}
        step=${jt(this.step)}
        .value=${this._value}
        @blur=${this._onBlur}
        @change=${this._onChange}
        @focus=${this._onFocus}
        @input=${this._onInput}
        @keydown=${this._onKeyDown}
      >
      <slot name="content-after"></slot>
    `}};Ne.styles=Fe,Ne.formAssociated=!0,Ne.shadowRootOptions={...at.shadowRootOptions,delegatesFocus:!0},Pe([dt()],Ne.prototype,"autocomplete",void 0),Pe([dt({type:Boolean,reflect:!0})],Ne.prototype,"autofocus",void 0),Pe([dt({attribute:"default-value"})],Ne.prototype,"defaultValue",void 0),Pe([dt({type:Boolean,reflect:!0})],Ne.prototype,"disabled",void 0),Pe([dt({type:Boolean,reflect:!0})],Ne.prototype,"focused",void 0),Pe([dt({type:Boolean,reflect:!0})],Ne.prototype,"invalid",void 0),Pe([dt({attribute:!1})],Ne.prototype,"label",void 0),Pe([dt({type:Number})],Ne.prototype,"max",void 0),Pe([dt({type:Number})],Ne.prototype,"maxLength",void 0),Pe([dt({type:Number})],Ne.prototype,"min",void 0),Pe([dt({type:Number})],Ne.prototype,"minLength",void 0),Pe([dt({type:Boolean,reflect:!0})],Ne.prototype,"multiple",void 0),Pe([dt({reflect:!0})],Ne.prototype,"name",void 0),Pe([dt()],Ne.prototype,"pattern",void 0),Pe([dt()],Ne.prototype,"placeholder",void 0),Pe([dt({type:Boolean,reflect:!0})],Ne.prototype,"readonly",void 0),Pe([dt({type:Boolean,reflect:!0})],Ne.prototype,"required",void 0),Pe([dt({type:Number})],Ne.prototype,"step",void 0),Pe([dt({reflect:!0})],Ne.prototype,"type",null),Pe([dt()],Ne.prototype,"value",null),Pe([pt("#input")],Ne.prototype,"_inputEl",void 0),Pe([ut()],Ne.prototype,"_value",void 0),Pe([ut()],Ne.prototype,"_type",void 0),Ne=Pe([yt("vscode-textfield")],Ne);const De=[wt,n`
    :host {
      color: var(--vscode-foreground, #cccccc);
      font-family: var(--vscode-font-family, sans-serif);
      font-size: var(--vscode-font-size, 13px);
      font-weight: 600;
      line-height: ${1.2307692307692308};
      cursor: default;
      display: block;
      padding: 5px 0;
    }

    .wrapper {
      display: block;
    }

    .wrapper.required:after {
      content: ' *';
    }

    ::slotted(.normal) {
      font-weight: normal;
    }

    ::slotted(.lightened) {
      color: var(--vscode-foreground, #cccccc);
      opacity: 0.9;
    }
  `];var Ve=function(t,e,s,i){for(var o,r=arguments.length,n=r<3?e:null===i?i=Object.getOwnPropertyDescriptor(e,s):i,a=t.length-1;a>=0;a--)(o=t[a])&&(n=(r<3?o(n):r>3?o(e,s,n):o(e,s))||n);return r>3&&n&&Object.defineProperty(e,s,n),n};let Re=class extends xt{constructor(){super(...arguments),this.required=!1,this._id="",this._htmlFor="",this._connected=!1}set htmlFor(t){this._htmlFor=t,this.setAttribute("for",t),this._connected&&this._connectWithTarget()}get htmlFor(){return this._htmlFor}set id(t){this._id=t}get id(){return this._id}attributeChangedCallback(t,e,s){super.attributeChangedCallback(t,e,s)}connectedCallback(){super.connectedCallback(),this._connected=!0,""===this._id&&(this._id=Se("vscode-label-"),this.setAttribute("id",this._id)),this._connectWithTarget()}_getTarget(){let t=null;if(this._htmlFor){const e=this.getRootNode({composed:!1});e&&(t=e.querySelector(`#${this._htmlFor}`))}return t}async _connectWithTarget(){await this.updateComplete;const t=this._getTarget();(t instanceof Ae||t instanceof te)&&t.setAttribute("aria-labelledby",this._id);let e="";this.textContent&&(e=this.textContent.trim()),(t instanceof Ne||t instanceof Ie)&&(t.label=e)}_handleClick(){const t=this._getTarget();t&&"focus"in t&&t.focus()}render(){return L`
      <label
        class=${Et({wrapper:!0,required:this.required})}
        @click=${this._handleClick}
        ><slot></slot
      ></label>
    `}};Re.styles=De,Ve([dt({reflect:!0,attribute:"for"})],Re.prototype,"htmlFor",null),Ve([dt()],Re.prototype,"id",null),Ve([dt({type:Boolean,reflect:!0})],Re.prototype,"required",void 0),Re=Ve([yt("vscode-label")],Re);const Te=L`
  <span class="icon">
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      xmlns="http://www.w3.org/2000/svg"
      fill="currentColor"
    >
      <path
        fill-rule="evenodd"
        clip-rule="evenodd"
        d="M7.976 10.072l4.357-4.357.62.618L8.284 11h-.618L3 6.333l.619-.618 4.357 4.357z"
      />
    </svg>
  </span>
`,{I:Le}=it,Ue=()=>document.createComment(""),qe=(t,e,s)=>{const i=t._$AA.parentNode,o=void 0===e?t._$AB:e._$AA;if(void 0===s){const e=i.insertBefore(Ue(),o),r=i.insertBefore(Ue(),o);s=new Le(e,r,t,t.options)}else{const e=s._$AB.nextSibling,r=s._$AM,n=r!==t;if(n){let e;s._$AQ?.(t),s._$AM=t,void 0!==s._$AP&&(e=t._$AU)!==r._$AU&&s._$AP(e)}if(e!==o||n){let t=s._$AA;for(;t!==e;){const e=t.nextSibling;i.insertBefore(t,o),t=e}}}return s},He=(t,e,s=t)=>(t._$AI(e,s),t),Ke={},We=t=>{t._$AP?.(!1,!0);let e=t._$AA;const s=t._$AB.nextSibling;for(;e!==s;){const t=e.nextSibling;e.remove(),e=t}},Ge=(t,e,s)=>{const i=new Map;for(let o=e;o<=s;o++)i.set(t[o],o);return i},Je=Ot(class extends At{constructor(t){if(super(t),t.type!==St)throw Error("repeat() can only be used in text expressions")}dt(t,e,s){let i;void 0===s?s=e:void 0!==e&&(i=e);const o=[],r=[];let n=0;for(const e of t)o[n]=i?i(e,n):n,r[n]=s(e,n),n++;return{values:r,keys:o}}render(t,e,s){return this.dt(t,e,s).values}update(t,[e,s,i]){const o=(t=>t._$AH)(t),{values:r,keys:n}=this.dt(e,s,i);if(!Array.isArray(o))return this.ut=n,r;const a=this.ut??=[],c=[];let l,h,d=0,u=o.length-1,v=0,p=r.length-1;for(;d<=u&&v<=p;)if(null===o[d])d++;else if(null===o[u])u--;else if(a[d]===n[v])c[v]=He(o[d],r[v]),d++,v++;else if(a[u]===n[p])c[p]=He(o[u],r[p]),u--,p--;else if(a[d]===n[p])c[p]=He(o[d],r[p]),qe(t,c[p+1],o[d]),d++,p--;else if(a[u]===n[v])c[v]=He(o[u],r[v]),qe(t,o[d],o[u]),u--,v++;else if(void 0===l&&(l=Ge(n,v,p),h=Ge(a,d,u)),l.has(a[d]))if(l.has(a[u])){const e=h.get(n[v]),s=void 0!==e?o[e]:null;if(null===s){const e=qe(t,o[d]);He(e,r[v]),c[v]=e}else c[v]=He(s,r[v]),qe(t,o[d],s),o[e]=null;v++}else We(o[u]),u--;else We(o[d]),d++;for(;v<=p;){const e=qe(t,c[p+1]);He(e,r[v]),c[v++]=e}for(;d<=u;){const t=o[d++];null!==t&&We(t)}return this.ut=n,((t,e=Ke)=>{t._$AH=e})(t,c),U}});var Ye=function(t,e,s,i){for(var o,r=arguments.length,n=r<3?e:null===i?i=Object.getOwnPropertyDescriptor(e,s):i,a=t.length-1;a>=0;a--)(o=t[a])&&(n=(r<3?o(n):r>3?o(e,s,n):o(e,s))||n);return r>3&&n&&Object.defineProperty(e,s,n),n};let Xe=class extends xt{constructor(){super(...arguments),this.description="",this.selected=!1,this.disabled=!1,this._initialized=!1,this._handleSlotChange=()=>{this._initialized&&this.dispatchEvent(new Event("vsc-option-state-change",{bubbles:!0}))}}connectedCallback(){super.connectedCallback(),this.updateComplete.then((()=>{this._initialized=!0}))}willUpdate(t){this._initialized&&(t.has("description")||t.has("value")||t.has("selected")||t.has("disabled"))&&this.dispatchEvent(new Event("vsc-option-state-change",{bubbles:!0}))}render(){return L`<slot @slotchange=${this._handleSlotChange}></slot>`}};Xe.styles=wt,Ye([dt({type:String})],Xe.prototype,"value",void 0),Ye([dt({type:String})],Xe.prototype,"description",void 0),Ye([dt({type:Boolean,reflect:!0})],Xe.prototype,"selected",void 0),Ye([dt({type:Boolean,reflect:!0})],Xe.prototype,"disabled",void 0),Xe=Ye([yt("vscode-option")],Xe);const Ze=(t,e,s)=>{const i=[];return t.forEach((t=>{let o;switch(s){case"startsWithPerTerm":o=((t,e)=>{const s={match:!1,ranges:[]},i=t.toLowerCase(),o=e.toLowerCase(),r=i.split(" ");let n=0;return r.forEach(((e,i)=>{if(i>0&&(n+=r[i-1].length+1),s.match)return;const a=e.indexOf(o),c=o.length;0===a&&(s.match=!0,s.ranges.push([n+a,Math.min(n+a+c,t.length)]))})),s})(t.label,e);break;case"startsWith":o=((t,e)=>{const s={match:!1,ranges:[]};return 0===t.toLowerCase().indexOf(e.toLowerCase())&&(s.match=!0,s.ranges=[[0,e.length]]),s})(t.label,e);break;case"contains":o=((t,e)=>{const s={match:!1,ranges:[]},i=t.toLowerCase().indexOf(e.toLowerCase());return i>-1&&(s.match=!0,s.ranges=[[i,i+e.length]]),s})(t.label,e);break;default:o=((t,e)=>{const s={match:!1,ranges:[]};let i=0,o=0;const r=e.length-1,n=t.toLowerCase(),a=e.toLowerCase();for(let t=0;t<=r;t++){if(o=n.indexOf(a[t],i),-1===o)return{match:!1,ranges:[]};s.match=!0,s.ranges.push([o,o+1]),i=o+1}return s})(t.label,e)}o.match&&i.push({...t,ranges:o.ranges})})),i},Qe=t=>{const e=[];return" "===t?(e.push(L`&nbsp;`),e):(0===t.indexOf(" ")&&e.push(L`&nbsp;`),e.push(L`${t.trimStart().trimEnd()}`),t.lastIndexOf(" ")===t.length-1&&e.push(L`&nbsp;`),e)};function ts(t,e){let s=0;if(e<0||!t[e]||!t[e+1])return s;for(let i=e+1;i<t.length;i++)if(!t[i].disabled){s=i;break}return s}function es(t,e){let s=0;if(e<0||!t[e]||!t[e-1])return s;for(let i=e-1;i>=0;i--)if(!t[i].disabled){s=i;break}return s}var ss=function(t,e,s,i){for(var o,r=arguments.length,n=r<3?e:null===i?i=Object.getOwnPropertyDescriptor(e,s):i,a=t.length-1;a>=0;a--)(o=t[a])&&(n=(r<3?o(n):r>3?o(e,s,n):o(e,s))||n);return r>3&&n&&Object.defineProperty(e,s,n),n};const is=22;class os extends xt{set disabled(t){this._disabled=t,this.ariaDisabled=t?"true":"false",!0===t?(this._originalTabIndex=this.tabIndex,this.tabIndex=-1):(this.tabIndex=this._originalTabIndex??0,this._originalTabIndex=void 0),this.requestUpdate()}get disabled(){return this._disabled}set filter(t){["contains","fuzzy","startsWith","startsWithPerTerm"].includes(t)?this._filter=t:(this._filter="fuzzy",console.warn(`[VSCode Webview Elements] Invalid filter: "${t}", fallback to default. Valid values are: "contains", "fuzzy", "startsWith", "startsWithPerm".`,this))}get filter(){return this._filter}set options(t){this._options=t.map(((t,e)=>({...t,index:e})))}get options(){return this._options.map((({label:t,value:e,description:s,selected:i,disabled:o})=>({label:t,value:e,description:s,selected:i,disabled:o})))}constructor(){super(),this.ariaExpanded="false",this.creatable=!1,this.combobox=!1,this.invalid=!1,this.focused=!1,this.open=!1,this.position="below",this.tabIndex=0,this._firstUpdateCompleted=!1,this._activeIndex=-1,this._currentDescription="",this._filter="fuzzy",this._filterPattern="",this._selectedIndex=-1,this._selectedIndexes=[],this._options=[],this._value="",this._values=[],this._listScrollTop=0,this._isPlaceholderOptionActive=!1,this._isBeingFiltered=!1,this._multiple=!1,this._valueOptionIndexMap={},this._isHoverForbidden=!1,this._disabled=!1,this._originalTabIndex=void 0,this._onClickOutside=t=>{-1===t.composedPath().findIndex((t=>t===this))&&(this._toggleDropdown(!1),window.removeEventListener("click",this._onClickOutside))},this._onMouseMove=()=>{this._isHoverForbidden=!1,window.removeEventListener("mousemove",this._onMouseMove)},this._onComponentKeyDown=t=>{[" ","ArrowUp","ArrowDown","Escape"].includes(t.key)&&(t.stopPropagation(),t.preventDefault()),"Enter"===t.key&&this._onEnterKeyDown(t)," "===t.key&&this._onSpaceKeyDown(),"Escape"===t.key&&this._toggleDropdown(!1),"ArrowUp"===t.key&&this._onArrowUpKeyDown(),"ArrowDown"===t.key&&this._onArrowDownKeyDown()},this._onComponentFocus=()=>{this.focused=!0},this._onComponentBlur=()=>{this.focused=!1},this.addEventListener("vsc-option-state-change",(t=>{t.stopPropagation(),this._setStateFromSlottedElements(),this.requestUpdate()}))}connectedCallback(){super.connectedCallback(),this.addEventListener("keydown",this._onComponentKeyDown),this.addEventListener("focus",this._onComponentFocus),this.addEventListener("blur",this._onComponentBlur)}disconnectedCallback(){super.disconnectedCallback(),this.removeEventListener("keydown",this._onComponentKeyDown),this.removeEventListener("focus",this._onComponentFocus),this.removeEventListener("blur",this._onComponentBlur)}firstUpdated(t){this._firstUpdateCompleted=!0}willUpdate(t){t.has("required")&&this._firstUpdateCompleted&&this._manageRequired()}get _filteredOptions(){return this.combobox&&""!==this._filterPattern?Ze(this._options,this._filterPattern,this._filter):this._options}get _currentOptions(){return this.combobox?this._filteredOptions:this._options}get _isSuggestedOptionVisible(){if(!this.combobox||!this.creatable)return!1;const t=void 0!==this._valueOptionIndexMap[this._filterPattern],e=this._filterPattern.length>0;return!t&&e}_manageRequired(){}_setStateFromSlottedElements(){const t=[];let e=0;const s=this._assignedOptions??[],i=[],o=[];this._valueOptionIndexMap={},s.forEach(((s,r)=>{const{innerText:n,description:a,disabled:c}=s,l="string"==typeof s.value?s.value:n.trim(),h=s.selected??!1,d={label:n.trim(),value:l,description:a,selected:h,index:e,disabled:c};e=t.push(d),h&&!this._multiple&&(this._activeIndex=r),h&&(i.push(t.length-1),o.push(l)),this._valueOptionIndexMap[d.value]=d.index})),this._options=t,i.length>0&&(this._selectedIndex=i[0],this._selectedIndexes=i,this._value=o[0],this._values=o),this._multiple||this.combobox||0!==i.length||(this._selectedIndex=this._options.length>0?0:-1)}async _toggleDropdown(t){this.open=t,this.ariaExpanded=String(t),t&&!this._multiple&&(this._activeIndex=this._selectedIndex),!t||this._multiple||this.combobox||(this._activeIndex=this._selectedIndex,this._activeIndex>9&&(await this.updateComplete,this._listElement.scrollTop=Math.floor(this._activeIndex*is))),t?window.addEventListener("click",this._onClickOutside):window.removeEventListener("click",this._onClickOutside)}_createSuggestedOption(){const t=this._options.length,e=document.createElement("vscode-option");return e.value=this._filterPattern,rt(this._filterPattern,e),this.appendChild(e),t}_dispatchChangeEvent(){this._multiple?this.dispatchEvent(new CustomEvent("vsc-change",{detail:{selectedIndexes:this._selectedIndexes,value:this._values}})):this.dispatchEvent(new CustomEvent("vsc-change",{detail:{selectedIndex:this._selectedIndex,value:this._value}})),this.dispatchEvent(new Event("change")),this.dispatchEvent(new Event("input"))}async _createAndSelectSuggestedOption(){}_onFaceClick(){this._toggleDropdown(!this.open),this._multiple&&(this._activeIndex=0)}_toggleComboboxDropdown(){this._filterPattern="",this._toggleDropdown(!this.open),this._multiple&&(this._activeIndex=-1)}_onComboboxButtonClick(){this._toggleComboboxDropdown()}_onComboboxButtonKeyDown(t){"Enter"===t.key&&this._toggleComboboxDropdown()}_onOptionMouseOver(t){if(this._isHoverForbidden)return;const e=t.target;e.matches(".option")&&(e.matches(".placeholder")?(this._isPlaceholderOptionActive=!0,this._activeIndex=-1):(this._isPlaceholderOptionActive=!1,this._activeIndex=Number(this.combobox?e.dataset.filteredIndex:e.dataset.index)))}_onPlaceholderOptionMouseOut(){this._isPlaceholderOptionActive=!1}_onNoOptionsClick(t){t.stopPropagation()}_onEnterKeyDown(t){this._isBeingFiltered=!1;if(!!t?.composedPath&&t.composedPath().find((t=>!!t.matches&&t.matches("vscode-button.button-accept"))))return;const e=this.combobox?this._filteredOptions:this._options,s=!this.open;this._toggleDropdown(s),this._multiple||s||this._selectedIndex===this._activeIndex||(this._selectedIndex=this._activeIndex>-1?e[this._activeIndex].index:-1,this._value=this._selectedIndex>-1?this._options[this._selectedIndex].value:"",this._dispatchChangeEvent()),this.combobox&&(this._isPlaceholderOptionActive?this._createAndSelectSuggestedOption():(this._multiple||s||(this._selectedIndex=this._activeIndex>-1?this._filteredOptions[this._activeIndex].index:-1),!this._multiple&&s&&this.updateComplete.then((()=>{this._scrollActiveElementToTop()})))),this._multiple&&s&&(this._activeIndex=0)}_onSpaceKeyDown(){if(this.open){if(this.open&&this._multiple&&this._activeIndex>-1){const t=this.combobox?this._filteredOptions:this._options,e=t[this._activeIndex],s=[];this._options[e.index].selected=!e.selected,t.forEach((({index:t})=>{const{selected:e}=this._options[t];e&&s.push(t)})),this._selectedIndexes=s}}else this._toggleDropdown(!0)}_scrollActiveElementToTop(){this._listElement.scrollTop=Math.floor(this._activeIndex*is)}async _adjustOptionListScrollPos(t,e){let s=this.combobox?this._filteredOptions.length:this._options.length;if(this._isSuggestedOptionVisible&&(s+=1),s<=10)return;this._isHoverForbidden=!0,window.addEventListener("mousemove",this._onMouseMove);const i=this._listElement.scrollTop,o=e*is,r=o>=i&&o<=i+220-is;"down"===t&&(r||(this._listElement.scrollTop=e*is-198)),"up"===t&&(r||(this._listElement.scrollTop=Math.floor(this._activeIndex*is)))}_onArrowUpKeyDown(){if(this.open){if(this._activeIndex<=0&&(!this.combobox||!this.creatable))return;if(this._isPlaceholderOptionActive){const t=this._currentOptions.length-1;this._activeIndex=t,this._isPlaceholderOptionActive=!1}else{const t=es(this.combobox?this._filteredOptions:this._options,this._activeIndex);t>-1&&(this._activeIndex=t,this._adjustOptionListScrollPos("up",t))}}}_onArrowDownKeyDown(){let t=this.combobox?this._filteredOptions.length:this._options.length;const e=this.combobox?this._filteredOptions:this._options,s=this._isSuggestedOptionVisible;if(s&&(t+=1),this.open){if(this._isPlaceholderOptionActive&&-1===this._activeIndex)return;if(s&&this._activeIndex===t-2)this._isPlaceholderOptionActive=!0,this._adjustOptionListScrollPos("down",t-1),this._activeIndex=-1;else if(this._activeIndex<t-1){const t=ts(e,this._activeIndex);t>-1&&(this._activeIndex=t,this._adjustOptionListScrollPos("down",t))}}}_onSlotChange(){this._setStateFromSlottedElements(),this.requestUpdate()}_onComboboxInputFocus(t){t.target.select(),this._isBeingFiltered=!1,this._filterPattern=""}_onComboboxInputBlur(){this._isBeingFiltered=!1}_onComboboxInputInput(t){this._isBeingFiltered=!0,this._filterPattern=t.target.value,this._activeIndex=-1,this._toggleDropdown(!0)}_onComboboxInputClick(){this._isBeingFiltered=""!==this._filterPattern,this._toggleDropdown(!0)}_onOptionClick(t){this._isBeingFiltered=!1}_renderOptions(){const t=this.combobox?this._filteredOptions:this._options;return L`
      <ul
        class="options"
        @click=${this._onOptionClick}
        @mouseover=${this._onOptionMouseOver}
      >
        ${Je(t,(t=>t.index),((t,e)=>{const s={active:e===this._activeIndex&&!t.disabled,disabled:t.disabled,option:!0,selected:t.selected},i={"checkbox-icon":!0,checked:t.selected},o=t.ranges?.length?((t,e)=>{const s=[],i=e.length;return i<1?L`${t}`:(e.forEach(((o,r)=>{const n=t.substring(o[0],o[1]);0===r&&0!==o[0]&&s.push(...Qe(t.substring(0,e[0][0]))),r>0&&r<i&&o[0]-e[r-1][1]!=0&&s.push(...Qe(t.substring(e[r-1][1],o[0]))),s.push(L`<b>${Qe(n)}</b>`),r===i-1&&o[1]<t.length&&s.push(...Qe(t.substring(o[1],t.length)))})),s)})(t.label,t.ranges??[]):t.label;return L`
              <li
                class=${Et(s)}
                data-index=${t.index}
                data-filtered-index=${e}
              >
                ${this._multiple?L`<span class=${Et(i)}></span
                      ><span class="option-label">${o}</span>`:o}
              </li>
            `}))}
        ${this._renderPlaceholderOption(t.length<1)}
      </ul>
    `}_renderPlaceholderOption(t){return this.combobox?this._valueOptionIndexMap[this._filterPattern]?q:this.creatable&&this._filterPattern.length>0?L`<li
        class=${Et({option:!0,placeholder:!0,active:this._isPlaceholderOptionActive})}
        @mouseout=${this._onPlaceholderOptionMouseOut}
      >
        Add "${this._filterPattern}"
      </li>`:t?L`<li class="no-options" @click=${this._onNoOptionsClick}>
            No options
          </li>`:q:q}_renderDescription(){if(!this._options[this._activeIndex])return q;const{description:t}=this._options[this._activeIndex];return t?L`<div class="description">${t}</div>`:q}_renderSelectFace(){return L`${q}`}_renderMultiSelectLabel(){switch(this._selectedIndexes.length){case 0:return L`<span class="select-face-badge no-item"
          >No items selected</span
        >`;case 1:return L`<span class="select-face-badge">1 item selected</span>`;default:return L`<span class="select-face-badge"
          >${this._selectedIndexes.length} items selected</span
        >`}}_renderComboboxFace(){let t="";return t=this._isBeingFiltered?this._filterPattern:this._selectedIndex>-1?this._options[this._selectedIndex]?.label??"":"",L`
      <div class="combobox-face face">
        ${this._multiple?this._renderMultiSelectLabel():q}
        <input
          class="combobox-input"
          spellcheck="false"
          type="text"
          autocomplete="off"
          .value=${t}
          @focus=${this._onComboboxInputFocus}
          @blur=${this._onComboboxInputBlur}
          @input=${this._onComboboxInputInput}
          @click=${this._onComboboxInputClick}
        >
        <button
          class="combobox-button"
          type="button"
          @click=${this._onComboboxButtonClick}
          @keydown=${this._onComboboxButtonKeyDown}
        >
          ${Te}
        </button>
      </div>
    `}_renderDropdownControls(){return L`${q}`}_renderDropdown(){const t=Et({dropdown:!0,multiple:this._multiple});return L`
      <div class=${t}>
        ${"above"===this.position?this._renderDescription():q}
        ${this._renderOptions()} ${this._renderDropdownControls()}
        ${"below"===this.position?this._renderDescription():q}
      </div>
    `}render(){return L`
      <slot class="main-slot" @slotchange=${this._onSlotChange}></slot>
      ${this.combobox?this._renderComboboxFace():this._renderSelectFace()}
      ${this.open?this._renderDropdown():q}
    `}}ss([dt({type:String,reflect:!0,attribute:"aria-expanded"})],os.prototype,"ariaExpanded",void 0),ss([dt({type:Boolean,reflect:!0})],os.prototype,"creatable",void 0),ss([dt({type:Boolean,reflect:!0})],os.prototype,"combobox",void 0),ss([dt({type:Boolean,reflect:!0})],os.prototype,"disabled",null),ss([dt({type:Boolean,reflect:!0})],os.prototype,"invalid",void 0),ss([dt()],os.prototype,"filter",null),ss([dt({type:Boolean,reflect:!0})],os.prototype,"focused",void 0),ss([dt({type:Boolean,reflect:!0})],os.prototype,"open",void 0),ss([dt({type:Array})],os.prototype,"options",null),ss([dt({reflect:!0})],os.prototype,"position",void 0),ss([dt({type:Number,attribute:!0,reflect:!0})],os.prototype,"tabIndex",void 0),ss([ft({flatten:!0,selector:"vscode-option"})],os.prototype,"_assignedOptions",void 0),ss([ut()],os.prototype,"_activeIndex",void 0),ss([ut()],os.prototype,"_currentDescription",void 0),ss([ut()],os.prototype,"_filter",void 0),ss([ut()],os.prototype,"_filteredOptions",null),ss([ut()],os.prototype,"_filterPattern",void 0),ss([ut()],os.prototype,"_selectedIndex",void 0),ss([ut()],os.prototype,"_selectedIndexes",void 0),ss([ut()],os.prototype,"_options",void 0),ss([ut()],os.prototype,"_value",void 0),ss([ut()],os.prototype,"_values",void 0),ss([ut()],os.prototype,"_listScrollTop",void 0),ss([ut()],os.prototype,"_isPlaceholderOptionActive",void 0),ss([ut()],os.prototype,"_isBeingFiltered",void 0),ss([pt(".options")],os.prototype,"_listElement",void 0);var rs=[wt,n`
    :host {
      display: inline-block;
      max-width: 100%;
      outline: none;
      position: relative;
      width: 320px;
    }

    .main-slot {
      display: none;
    }

    .select-face,
    .combobox-face {
      background-color: var(--vscode-settings-dropdownBackground, #313131);
      border-color: var(--vscode-settings-dropdownBorder, #3c3c3c);
      border-radius: 2px;
      border-style: solid;
      border-width: 1px;
      box-sizing: border-box;
      color: var(--vscode-settings-dropdownForeground, #cccccc);
      font-family: var(--vscode-font-family, sans-serif);
      font-size: var(--vscode-font-size, 13px);
      font-weight: var(--vscode-font-weight, normal);
      line-height: 18px;
      position: relative;
      user-select: none;
      width: 100%;
    }

    :host([invalid]) .select-face,
    :host(:invalid) .select-face,
    :host([invalid]) .combobox-face,
    :host(:invalid) .combobox-face {
      background-color: var(--vscode-inputValidation-errorBackground, #5a1d1d);
      border-color: var(--vscode-inputValidation-errorBorder, #be1100);
    }

    .select-face {
      cursor: pointer;
      display: block;
      padding: 3px 4px;
    }

    .select-face .text {
      display: block;
      height: 18px;
      overflow: hidden;
    }

    .select-face.multiselect {
      padding: 0;
    }

    .select-face-badge {
      background-color: var(--vscode-badge-background, #616161);
      border-radius: 2px;
      color: var(--vscode-badge-foreground, #f8f8f8);
      display: inline-block;
      flex-shrink: 0;
      font-size: 11px;
      line-height: 16px;
      margin: 2px;
      padding: 2px 3px;
      text-transform: uppercase;
      white-space: nowrap;
    }

    .select-face-badge.no-item {
      background-color: transparent;
      color: inherit;
    }

    .combobox-face {
      display: flex;
    }

    :host(:focus) .select-face,
    :host(:focus) .combobox-face,
    :host([focused]) .select-face,
    :host([focused]) .combobox-face {
      border-color: var(--vscode-focusBorder, #0078d4);
      outline: none;
    }

    .combobox-input {
      background-color: transparent;
      box-sizing: border-box;
      border: 0;
      color: var(--vscode-foreground, #cccccc);
      display: block;
      font-family: var(--vscode-font-family, sans-serif);
      font-size: var(--vscode-font-size, 13px);
      line-height: 16px;
      padding: 4px;
      width: 100%;
    }

    .combobox-input:focus {
      outline: none;
    }

    .combobox-button {
      align-items: center;
      background-color: transparent;
      border: 0;
      border-radius: 2px;
      box-sizing: content-box;
      color: var(--vscode-foreground, #cccccc);
      cursor: pointer;
      display: flex;
      flex-shrink: 0;
      height: 16px;
      justify-content: center;
      margin: 1px 1px 0 0;
      padding: 3px;
      width: 22px;
    }

    .combobox-button:hover,
    .combobox-button:focus-visible {
      background-color: var(
        --vscode-toolbar-hoverBackground,
        rgba(90, 93, 94, 0.31)
      );
      outline-style: dashed;
      outline-color: var(--vscode-toolbar-hoverOutline, transparent);
    }

    .combobox-button:focus-visible {
      outline: none;
    }

    .icon {
      color: var(--vscode-foreground, #cccccc);
      display: block;
      height: 14px;
      pointer-events: none;
      width: 14px;
    }

    .select-face .icon {
      position: absolute;
      right: 6px;
      top: 5px;
    }

    .icon svg {
      color: var(--vscode-foreground, #cccccc);
      height: 100%;
      width: 100%;
    }

    .dropdown {
      background-color: var(--vscode-settings-dropdownBackground, #313131);
      border-color: var(--vscode-settings-dropdownListBorder, #454545);
      border-radius: 0 0 3px 3px;
      border-style: solid;
      border-width: 1px;
      box-sizing: border-box;
      left: 0;
      padding-bottom: 2px;
      position: absolute;
      top: 100%;
      width: 100%;
      z-index: var(--dropdown-z-index, 2);
    }

    :host([position='above']) .dropdown {
      border-radius: 3px 3px 0 0;
      bottom: 26px;
      padding-bottom: 0;
      padding-top: 2px;
      top: auto;
    }

    :host(:focus) .dropdown,
    :host([focused]) .dropdown {
      border-color: var(--vscode-focusBorder, #0078d4);
    }

    .options {
      box-sizing: border-box;
      cursor: pointer;
      list-style: none;
      margin: 0;
      max-height: 222px;
      overflow: auto;
      padding: 1px;
    }

    .option {
      align-items: center;
      box-sizing: border-box;
      color: var(--vscode-foreground, #cccccc);
      cursor: pointer;
      display: flex;
      font-family: var(--vscode-font-family, sans-serif);
      font-size: var(--vscode-font-size, 13px);
      font-weight: var(--vscode-font-weight, normal);
      height: 22px;
      line-height: 18px;
      min-height: calc(var(--vscode-font-size) * 1.3);
      padding: 1px 3px;
      user-select: none;
      outline-color: transparent;
      outline-offset: -1px;
      outline-style: solid;
      outline-width: 1px;
    }

    .option b {
      color: var(--vscode-list-highlightForeground, #2aaaff);
    }

    .option.active b {
      color: var(--vscode-list-focusHighlightForeground, #2aaaff);
    }

    .option:not(.disabled):hover {
      background-color: var(--vscode-list-hoverBackground, #2a2d2e);
      color: var(--vscode-list-hoverForeground, #ffffff);
    }

    :host-context(body[data-vscode-theme-kind='vscode-high-contrast'])
      .option:hover,
    :host-context(body[data-vscode-theme-kind='vscode-high-contrast-light'])
      .option:hover {
      outline-style: dotted;
      outline-color: var(--vscode-list-focusOutline, #0078d4);
      outline-width: 1px;
    }

    .option.disabled {
      cursor: not-allowed;
      opacity: 0.4;
    }

    .option.active,
    .option.active:hover {
      background-color: var(--vscode-list-activeSelectionBackground, #04395e);
      color: var(--vscode-list-activeSelectionForeground, #ffffff);
      outline-color: var(--vscode-list-activeSelectionBackground, #04395e);
      outline-style: solid;
      outline-width: 1px;
    }

    .no-options {
      align-items: center;
      border-color: transparent;
      border-style: solid;
      border-width: 1px;
      color: var(--vscode-foreground, #cccccc);
      cursor: default;
      display: flex;
      font-family: var(--vscode-font-family, sans-serif);
      font-size: var(--vscode-font-size, 13px);
      font-weight: var(--vscode-font-weight, normal);
      line-height: 18px;
      min-height: calc(var(--vscode-font-size) * 1.3);
      opacity: 0.85;
      padding: 1px 3px;
      user-select: none;
    }

    .placeholder {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .placeholder span {
      font-weight: bold;
    }

    .placeholder:not(.disabled):hover {
      color: var(--vscode-list-activeSelectionForeground, #ffffff);
    }

    :host-context(body[data-vscode-theme-kind='vscode-high-contrast'])
      .option.active,
    :host-context(body[data-vscode-theme-kind='vscode-high-contrast-light'])
      .option.active:hover {
      outline-color: var(--vscode-list-focusOutline, #0078d4);
      outline-style: dashed;
    }

    .option-label {
      display: block;
      pointer-events: none;
      width: 100%;
    }

    .dropdown.multiple .option.selected {
      background-color: var(--vscode-list-hoverBackground, #2a2d2e);
      outline-color: var(--vscode-list-hoverBackground, #2a2d2e);
    }

    .dropdown.multiple .option.selected.active {
      background-color: var(--vscode-list-activeSelectionBackground, #04395e);
      color: var(--vscode-list-activeSelectionForeground, #ffffff);
      outline-color: var(--vscode-list-activeSelectionBackground, #04395e);
    }

    .checkbox-icon {
      background-color: var(--vscode-settings-checkboxBackground, #313131);
      border: 1px solid currentColor;
      border-radius: 2px;
      box-sizing: border-box;
      height: 14px;
      margin-right: 5px;
      overflow: hidden;
      position: relative;
      width: 14px;
    }

    .checkbox-icon.checked:before,
    .checkbox-icon.checked:after {
      content: '';
      display: block;
      height: 5px;
      position: absolute;
      transform: rotate(-45deg);
      width: 10px;
    }

    .checkbox-icon.checked:before {
      background-color: var(--vscode-foreground, #cccccc);
      left: 1px;
      top: 2.5px;
    }

    .checkbox-icon.checked:after {
      background-color: var(--vscode-settings-checkboxBackground, #313131);
      left: 1px;
      top: -0.5px;
    }

    .dropdown-controls {
      display: flex;
      justify-content: flex-end;
      padding: 4px;
    }

    .dropdown-controls :not(:last-child) {
      margin-right: 4px;
    }

    .action-icon {
      align-items: center;
      background-color: transparent;
      border: 0;
      color: var(--vscode-foreground, #cccccc);
      cursor: pointer;
      display: flex;
      height: 24px;
      justify-content: center;
      padding: 0;
      width: 24px;
    }

    .action-icon:focus {
      outline: none;
    }

    .action-icon:focus-visible {
      outline: 1px solid var(--vscode-focusBorder, #0078d4);
      outline-offset: -1px;
    }

    .description {
      border-color: var(--vscode-settings-dropdownBorder, #3c3c3c);
      border-style: solid;
      border-width: 1px 0 0;
      color: var(--vscode-foreground, #cccccc);
      font-family: var(--vscode-font-family, sans-serif);
      font-size: var(--vscode-font-size, 13px);
      font-weight: var(--vscode-font-weight, normal);
      line-height: 1.3;
      padding: 6px 4px;
      word-wrap: break-word;
    }

    :host([position='above']) .description {
      border-width: 0 0 1px;
    }
  `],ns=function(t,e,s,i){for(var o,r=arguments.length,n=r<3?e:null===i?i=Object.getOwnPropertyDescriptor(e,s):i,a=t.length-1;a>=0;a--)(o=t[a])&&(n=(r<3?o(n):r>3?o(e,s,n):o(e,s))||n);return r>3&&n&&Object.defineProperty(e,s,n),n};let as=class extends os{set selectedIndexes(t){const e=[];t.forEach((t=>{void 0!==this._options[t]&&(e.includes(t)||(this._options[t].selected=!0,e.push(t)))})),this._selectedIndexes=e}get selectedIndexes(){return this._selectedIndexes}set value(t){const e=Array.isArray(t)?t.map((t=>String(t))):[String(t)];this._values=[],this._selectedIndexes.forEach((t=>{this._options[t].selected=!1})),this._selectedIndexes=[],e.forEach((t=>{"number"==typeof this._valueOptionIndexMap[t]&&(this._selectedIndexes.push(this._valueOptionIndexMap[t]),this._options[this._valueOptionIndexMap[t]].selected=!0,this._values.push(t))})),this._selectedIndexes.length>0?this._requestedValueToSetLater=[]:this._requestedValueToSetLater=Array.isArray(t)?t:[t],this._setFormValue(),this._manageRequired()}get value(){return this._values}get form(){return this._internals.form}get type(){return"select-multiple"}get validity(){return this._internals.validity}get validationMessage(){return this._internals.validationMessage}get willValidate(){return this._internals.willValidate}checkValidity(){return this._internals.checkValidity()}reportValidity(){return this._internals.reportValidity()}constructor(){super(),this.defaultValue=[],this.required=!1,this.name=void 0,this._requestedValueToSetLater=[],this._onOptionClick=t=>{const e=t.composedPath().find((t=>"matches"in t&&t.matches("li.option")));if(!e)return;if(e.classList.contains("placeholder"))return void this._createAndSelectSuggestedOption();const s=Number(e.dataset.index);if(this._options[s]){if(this._options[s].disabled)return;this._options[s].selected=!this._options[s].selected}this._selectedIndexes=[],this._values=[],this._options.forEach((t=>{t.selected&&(this._selectedIndexes.push(t.index),this._values.push(t.value))})),this._setFormValue(),this._manageRequired(),this._dispatchChangeEvent()},this._multiple=!0,this._internals=this.attachInternals()}connectedCallback(){super.connectedCallback(),this.updateComplete.then((()=>{this._setDefaultValue(),this._manageRequired()}))}formResetCallback(){this.updateComplete.then((()=>{this.value=this.defaultValue}))}formStateRestoreCallback(t,e){const s=Array.from(t.entries()).map((t=>String(t[1])));this.updateComplete.then((()=>{this.value=s}))}_setDefaultValue(){if(Array.isArray(this.defaultValue)&&this.defaultValue.length>0){const t=this.defaultValue.map((t=>String(t)));this.value=t}}_manageRequired(){const{value:t}=this;0===t.length&&this.required?this._internals.setValidity({valueMissing:!0},"Please select an item in the list.",this._faceElement):this._internals.setValidity({})}_setFormValue(){const t=new FormData;this._values.forEach((e=>{t.append(this.name??"",e)})),this._internals.setFormValue(t)}async _createAndSelectSuggestedOption(){super._createAndSelectSuggestedOption();const t=this._createSuggestedOption();await this.updateComplete,this.selectedIndexes=[...this.selectedIndexes,t],this._dispatchChangeEvent();const e=new CustomEvent("vsc-multi-select-create-option",{detail:{value:this._options[t]?.value??""}});this.dispatchEvent(e),this._toggleDropdown(!1),this._isPlaceholderOptionActive=!1}_onSlotChange(){super._onSlotChange(),this._requestedValueToSetLater.length>0&&this.options.forEach(((t,e)=>{this._requestedValueToSetLater.includes(t.value)&&(this._selectedIndexes.push(e),this._values.push(t.value),this._options[e].selected=!0,this._requestedValueToSetLater=this._requestedValueToSetLater.filter((e=>e!==t.value)))}))}_onMultiAcceptClick(){this._toggleDropdown(!1)}_onMultiDeselectAllClick(){this._selectedIndexes=[],this._values=[],this._options=this._options.map((t=>({...t,selected:!1}))),this._manageRequired(),this._dispatchChangeEvent()}_onMultiSelectAllClick(){this._selectedIndexes=[],this._values=[],this._options=this._options.map((t=>({...t,selected:!0}))),this._options.forEach(((t,e)=>{this._selectedIndexes.push(e),this._values.push(t.value),this._dispatchChangeEvent()})),this._setFormValue(),this._manageRequired()}_renderLabel(){switch(this._selectedIndexes.length){case 0:return L`<span class="select-face-badge no-item"
          >No items selected</span
        >`;case 1:return L`<span class="select-face-badge">1 item selected</span>`;default:return L`<span class="select-face-badge"
          >${this._selectedIndexes.length} items selected</span
        >`}}_renderSelectFace(){return L`
      <div
        class="select-face face multiselect"
        @click=${this._onFaceClick}
        tabindex=${this.tabIndex>-1?0:-1}
      >
        ${this._renderLabel()} ${Te}
      </div>
    `}_renderDropdownControls(){return this._filteredOptions.length>0?L`
          <div class="dropdown-controls">
            <button
              type="button"
              @click=${this._onMultiSelectAllClick}
              title="Select all"
              class="action-icon"
              id="select-all"
            >
              <vscode-icon name="checklist"></vscode-icon>
            </button>
            <button
              type="button"
              @click=${this._onMultiDeselectAllClick}
              title="Deselect all"
              class="action-icon"
              id="select-none"
            >
              <vscode-icon name="clear-all"></vscode-icon>
            </button>
            <vscode-button
              class="button-accept"
              @click=${this._onMultiAcceptClick}
              >OK</vscode-button
            >
          </div>
        `:L`${q}`}};as.styles=rs,as.shadowRootOptions={...at.shadowRootOptions,delegatesFocus:!0},as.formAssociated=!0,ns([dt({type:Array,attribute:"default-value"})],as.prototype,"defaultValue",void 0),ns([dt({type:Boolean,reflect:!0})],as.prototype,"required",void 0),ns([dt({reflect:!0})],as.prototype,"name",void 0),ns([dt({type:Array,attribute:!1})],as.prototype,"selectedIndexes",null),ns([dt({type:Array})],as.prototype,"value",null),ns([pt(".face")],as.prototype,"_faceElement",void 0),as=ns([yt("vscode-multi-select")],as);const cs=[wt,n`
    :host {
      align-items: center;
      display: block;
      height: 28px;
      margin: 0;
      outline: none;
      width: 28px;
    }

    .progress {
      height: 100%;
      width: 100%;
    }

    .background {
      fill: none;
      stroke: transparent;
      stroke-width: 2px;
    }

    .indeterminate-indicator-1 {
      fill: none;
      stroke: var(--vscode-progressBar-background, #0078d4);
      stroke-width: 2px;
      stroke-linecap: square;
      transform-origin: 50% 50%;
      transform: rotate(-90deg);
      transition: all 0.2s ease-in-out;
      animation: spin-infinite 2s linear infinite;
    }

    @keyframes spin-infinite {
      0% {
        stroke-dasharray: 0.01px 43.97px;
        transform: rotate(0deg);
      }
      50% {
        stroke-dasharray: 21.99px 21.99px;
        transform: rotate(450deg);
      }
      100% {
        stroke-dasharray: 0.01px 43.97px;
        transform: rotate(1080deg);
      }
    }
  `];var ls=function(t,e,s,i){for(var o,r=arguments.length,n=r<3?e:null===i?i=Object.getOwnPropertyDescriptor(e,s):i,a=t.length-1;a>=0;a--)(o=t[a])&&(n=(r<3?o(n):r>3?o(e,s,n):o(e,s))||n);return r>3&&n&&Object.defineProperty(e,s,n),n};let hs=class extends xt{constructor(){super(...arguments),this.ariaLabel="Loading",this.ariaLive="assertive",this.role="alert"}render(){return L`<svg class="progress" part="progress" viewBox="0 0 16 16">
      <circle
        class="background"
        part="background"
        cx="8px"
        cy="8px"
        r="7px"
      ></circle>
      <circle
        class="indeterminate-indicator-1"
        part="indeterminate-indicator-1"
        cx="8px"
        cy="8px"
        r="7px"
      ></circle>
    </svg>`}};hs.styles=cs,ls([dt({reflect:!0,attribute:"aria-label"})],hs.prototype,"ariaLabel",void 0),ls([dt({reflect:!0,attribute:"aria-live"})],hs.prototype,"ariaLive",void 0),ls([dt({reflect:!0})],hs.prototype,"role",void 0),hs=ls([yt("vscode-progress-ring")],hs);const ds=[wt,Gt,n`
    :host(:invalid) .icon,
    :host([invalid]) .icon {
      background-color: var(--vscode-inputValidation-errorBackground, #5a1d1d);
      border-color: var(--vscode-inputValidation-errorBorder, #be1100);
    }

    .icon {
      border-radius: 9px;
    }

    .icon.checked:before {
      background-color: currentColor;
      border-radius: 4px;
      content: '';
      height: 8px;
      left: 50%;
      margin: -4px 0 0 -4px;
      position: absolute;
      top: 50%;
      width: 8px;
    }

    :host(:focus):host(:not([disabled])) .icon {
      outline: 1px solid var(--vscode-focusBorder, #0078d4);
      outline-offset: -1px;
    }
  `];var us=function(t,e,s,i){for(var o,r=arguments.length,n=r<3?e:null===i?i=Object.getOwnPropertyDescriptor(e,s):i,a=t.length-1;a>=0;a--)(o=t[a])&&(n=(r<3?o(n):r>3?o(e,s,n):o(e,s))||n);return r>3&&n&&Object.defineProperty(e,s,n),n};let vs=class extends(Wt(Ht)){constructor(){super(),this.autofocus=!1,this.checked=!1,this.defaultChecked=!1,this.invalid=!1,this.name="",this.value="",this.disabled=!1,this.required=!1,this.role="radio",this.tabIndex=0,this._slottedText="",this.type="radio",this._handleClick=()=>{this.disabled||this.checked||(this._checkButton(),this._handleValueChange(),this._dispatchCustomEvent(),this.dispatchEvent(new Event("change",{bubbles:!0})))},this._handleKeyDown=t=>{this.disabled||"Enter"!==t.key&&" "!==t.key||(t.preventDefault()," "!==t.key||this.checked||(this.checked=!0,this._handleValueChange(),this._dispatchCustomEvent(),this.dispatchEvent(new Event("change",{bubbles:!0}))),"Enter"===t.key&&this._internals.form?.requestSubmit())},this._internals=this.attachInternals()}connectedCallback(){super.connectedCallback(),this.addEventListener("keydown",this._handleKeyDown),this.addEventListener("click",this._handleClick),this._handleValueChange()}disconnectedCallback(){super.disconnectedCallback(),this.removeEventListener("keydown",this._handleKeyDown),this.removeEventListener("click",this._handleClick)}update(t){super.update(t),t.has("checked")&&this._handleValueChange(),t.has("required")&&this._handleValueChange()}get form(){return this._internals.form}get validity(){return this._internals.validity}get validationMessage(){return this._internals.validationMessage}get willValidate(){return this._internals.willValidate}checkValidity(){return this._internals.checkValidity()}reportValidity(){return this._internals.reportValidity()}formResetCallback(){this._getRadios().forEach((t=>{t.checked=t.defaultChecked})),this.updateComplete.then((()=>{this._handleValueChange()}))}formStateRestoreCallback(t,e){this.value===t&&""!==t&&(this.checked=!0)}_dispatchCustomEvent(){this.dispatchEvent(new CustomEvent("vsc-change",{detail:{checked:this.checked,label:this.label,value:this.value},bubbles:!0,composed:!0}))}_getRadios(){const t=this.getRootNode({composed:!0});if(!t)return[];const e=t.querySelectorAll(`vscode-radio[name="${this.name}"]`);return Array.from(e)}_uncheckOthers(t){t.forEach((t=>{t!==this&&(t.checked=!1)}))}_checkButton(){const t=this._getRadios();this.checked=!0,t.forEach((t=>{t!==this&&(t.checked=!1)}))}setComponentValidity(t){t?this._internals.setValidity({}):this._internals.setValidity({valueMissing:!0},"Please select one of these options.",this._inputEl)}_setGroupValidity(t,e){this.updateComplete.then((()=>{t.forEach((t=>{t.setComponentValidity(e)}))}))}_setActualFormValue(){let t="";t=this.checked?this.value?this.value:"on":null,this._internals.setFormValue(t)}_handleValueChange(){const t=this._getRadios(),e=t.some((t=>t.required));if(this._setActualFormValue(),this.checked)this._uncheckOthers(t),this._setGroupValidity(t,!0);else{const s=!!t.find((t=>t.checked)),i=e&&!s;this._setGroupValidity(t,!i)}}render(){const t=Et({icon:!0,checked:this.checked}),e=Et({"label-inner":!0,"is-slot-empty":""===this._slottedText});return L`
      <div class="wrapper">
        <input
          ?autofocus=${this.autofocus}
          id="input"
          class="radio"
          type="checkbox"
          ?checked=${this.checked}
          value=${this.value}
          tabindex=${this.tabIndex}
        >
        <div class=${t}></div>
        <label for="input" class="label" @click=${this._handleClick}>
          <span class=${e}>
            ${this._renderLabelAttribute()}
            <slot @slotchange=${this._handleSlotChange}></slot>
          </span>
        </label>
      </div>
    `}};vs.styles=ds,vs.formAssociated=!0,vs.shadowRootOptions={...at.shadowRootOptions,delegatesFocus:!0},us([dt({type:Boolean,reflect:!0})],vs.prototype,"autofocus",void 0),us([dt({type:Boolean,reflect:!0})],vs.prototype,"checked",void 0),us([dt({type:Boolean,reflect:!0,attribute:"default-checked"})],vs.prototype,"defaultChecked",void 0),us([dt({type:Boolean,reflect:!0})],vs.prototype,"invalid",void 0),us([dt({reflect:!0})],vs.prototype,"name",void 0),us([dt()],vs.prototype,"value",void 0),us([dt({type:Boolean,reflect:!0})],vs.prototype,"disabled",void 0),us([dt({type:Boolean,reflect:!0})],vs.prototype,"required",void 0),us([dt({reflect:!0})],vs.prototype,"role",void 0),us([dt({type:Number,reflect:!0})],vs.prototype,"tabIndex",void 0),us([ut()],vs.prototype,"_slottedText",void 0),us([pt("#input")],vs.prototype,"_inputEl",void 0),us([dt()],vs.prototype,"type",void 0),vs=us([yt("vscode-radio")],vs);var ps=function(t,e,s,i){for(var o,r=arguments.length,n=r<3?e:null===i?i=Object.getOwnPropertyDescriptor(e,s):i,a=t.length-1;a>=0;a--)(o=t[a])&&(n=(r<3?o(n):r>3?o(e,s,n):o(e,s))||n);return r>3&&n&&Object.defineProperty(e,s,n),n};let bs=class extends os{set selectedIndex(t){this._selectedIndex=t,this._options[t]?(this._activeIndex=t,this._value=this._options[t].value,this._internals.setFormValue(this._value),this._manageRequired()):(this._value="",this._internals.setFormValue(""),this._manageRequired())}get selectedIndex(){return this._selectedIndex}set value(t){this._options[this._selectedIndex]&&(this._options[this._selectedIndex].selected=!1),this._selectedIndex=this._options.findIndex((e=>e.value===t)),this._selectedIndex>-1?(this._options[this._selectedIndex].selected=!0,this._value=t,this._requestedValueToSetLater=""):(this._value="",this._requestedValueToSetLater=t),this._internals.setFormValue(this._value),this._manageRequired()}get value(){return this._options[this._selectedIndex]?this._options[this._selectedIndex]?.value??"":""}get validity(){return this._internals.validity}get validationMessage(){return this._internals.validationMessage}get willValidate(){return this._internals.willValidate}checkValidity(){return this._internals.checkValidity()}reportValidity(){return this._internals.reportValidity()}updateInputValue(){if(!this.combobox)return;const t=this.renderRoot.querySelector(".combobox-input");t&&(t.value=this._options[this._selectedIndex]?this._options[this._selectedIndex].label:"")}constructor(){super(),this.defaultValue="",this.role="listbox",this.name=void 0,this.required=!1,this._requestedValueToSetLater="",this._multiple=!1,this._internals=this.attachInternals()}connectedCallback(){super.connectedCallback(),this.updateComplete.then((()=>{this._manageRequired()}))}formResetCallback(){this.value=this.defaultValue}formStateRestoreCallback(t,e){this.updateComplete.then((()=>{this.value=t}))}get type(){return"select-one"}get form(){return this._internals.form}async _createAndSelectSuggestedOption(){const t=this._createSuggestedOption();await this.updateComplete,this.selectedIndex=t,this._dispatchChangeEvent();const e=new CustomEvent("vsc-single-select-create-option",{detail:{value:this._options[t]?.value??""}});this.dispatchEvent(e),this._toggleDropdown(!1),this._isPlaceholderOptionActive=!1}_onSlotChange(){if(super._onSlotChange(),this._requestedValueToSetLater){const t=this._options.findIndex((t=>t.value===this._requestedValueToSetLater));t>0&&(this._selectedIndex=t,this._requestedValueToSetLater="")}this._selectedIndex>-1&&this._options.length>0?(this._internals.setFormValue(this._options[this._selectedIndex].value),this._manageRequired()):(this._internals.setFormValue(null),this._manageRequired())}_onArrowUpKeyDown(){if(super._onArrowUpKeyDown(),this.open||this._selectedIndex<=0)return;const t=es(this.combobox?this._filteredOptions:this._options,this._activeIndex);this._filterPattern="",this._selectedIndex=t,this._activeIndex=t,this._value=t>-1?this._options[t].value:"",this._internals.setFormValue(this._value),this._manageRequired(),this._dispatchChangeEvent()}_onArrowDownKeyDown(){if(super._onArrowDownKeyDown(),this.open||this._selectedIndex>=this._options.length-1)return;const t=ts(this.combobox?this._filteredOptions:this._options,this._activeIndex);this._filterPattern="",this._selectedIndex=t,this._activeIndex=t,this._value=t>-1?this._options[t].value:"",this._internals.setFormValue(this._value),this._manageRequired(),this._dispatchChangeEvent()}_onEnterKeyDown(t){super._onEnterKeyDown(t),this.updateInputValue(),this._internals.setFormValue(this._value),this._manageRequired()}_onOptionClick(t){super._onOptionClick(t);const e=t.composedPath().find((t=>{if("matches"in t)return t.matches("li.option")}));if(!e||e.matches(".disabled"))return;e.classList.contains("placeholder")?this.creatable&&this._createAndSelectSuggestedOption():(this._selectedIndex=Number(e.dataset.index),this._value=this._options[this._selectedIndex].value,this._toggleDropdown(!1),this._internals.setFormValue(this._value),this._manageRequired(),this._dispatchChangeEvent())}_manageRequired(){const{value:t}=this;""===t&&this.required?this._internals.setValidity({valueMissing:!0},"Please select an item in the list.",this._face):this._internals.setValidity({})}_renderSelectFace(){const t=this._options[this._selectedIndex]?.label??"";return L`
      <div
        class="select-face face"
        @click=${this._onFaceClick}
        tabindex=${this.tabIndex>-1?0:-1}
      >
        <span class="text">${t}</span> ${Te}
      </div>
    `}};bs.styles=rs,bs.shadowRootOptions={...at.shadowRootOptions,delegatesFocus:!0},bs.formAssociated=!0,ps([dt({attribute:"default-value"})],bs.prototype,"defaultValue",void 0),ps([dt({type:String,attribute:!0,reflect:!0})],bs.prototype,"role",void 0),ps([dt({reflect:!0})],bs.prototype,"name",void 0),ps([dt({type:Number,attribute:"selected-index"})],bs.prototype,"selectedIndex",null),ps([dt({type:String})],bs.prototype,"value",null),ps([dt({type:Boolean,reflect:!0})],bs.prototype,"required",void 0),ps([pt(".face")],bs.prototype,"_face",void 0),bs=ps([yt("vscode-single-select")],bs);const fs=[wt,n`
    :host {
      display: block;
      position: relative;
    }

    .scrollable-container {
      height: 100%;
      overflow: auto;
    }

    .scrollable-container::-webkit-scrollbar {
      cursor: default;
      width: 0;
    }

    .scrollable-container {
      scrollbar-width: none;
    }

    .shadow {
      box-shadow: var(--vscode-scrollbar-shadow, #000000) 0 6px 6px -6px inset;
      display: none;
      height: 3px;
      left: 0;
      pointer-events: none;
      position: absolute;
      top: 0;
      z-index: 1;
      width: 100%;
    }

    .shadow.visible {
      display: block;
    }

    .scrollbar-track {
      height: 100%;
      position: absolute;
      right: 0;
      top: 0;
      width: 10px;
      z-index: 100;
    }

    .scrollbar-track.hidden {
      display: none;
    }

    .scrollbar-thumb {
      background-color: transparent;
      min-height: var(--min-thumb-height, 20px);
      opacity: 0;
      position: absolute;
      right: 0;
      width: 10px;
    }

    .scrollbar-thumb.visible {
      background-color: var(
        --vscode-scrollbarSlider-background,
        rgba(121, 121, 121, 0.4)
      );
      opacity: 1;
      transition: opacity 100ms;
    }

    .scrollbar-thumb.fade {
      background-color: var(
        --vscode-scrollbarSlider-background,
        rgba(121, 121, 121, 0.4)
      );
      opacity: 0;
      transition: opacity 800ms;
    }

    .scrollbar-thumb.visible:hover {
      background-color: var(
        --vscode-scrollbarSlider-hoverBackground,
        rgba(100, 100, 100, 0.7)
      );
    }

    .scrollbar-thumb.visible.active,
    .scrollbar-thumb.visible.active:hover {
      background-color: var(
        --vscode-scrollbarSlider-activeBackground,
        rgba(191, 191, 191, 0.4)
      );
    }

    .prevent-interaction {
      bottom: 0;
      left: 0;
      right: 0;
      top: 0;
      position: absolute;
      z-index: 99;
    }

    .content {
      overflow: hidden;
    }
  `];var gs=function(t,e,s,i){for(var o,r=arguments.length,n=r<3?e:null===i?i=Object.getOwnPropertyDescriptor(e,s):i,a=t.length-1;a>=0;a--)(o=t[a])&&(n=(r<3?o(n):r>3?o(e,s,n):o(e,s))||n);return r>3&&n&&Object.defineProperty(e,s,n),n};let ms=class extends xt{constructor(){super(...arguments),this.shadow=!0,this.scrolled=!1,this._isDragging=!1,this._thumbHeight=0,this._thumbY=0,this._thumbVisible=!1,this._thumbFade=!1,this._thumbActive=!1,this._scrollThumbStartY=0,this._mouseStartY=0,this._scrollbarVisible=!0,this._scrollbarTrackZ=0,this._resizeObserverCallback=()=>{this._updateScrollbar()},this._onSlotChange=()=>{this._zIndexFix()},this._onScrollThumbMouseMoveBound=this._onScrollThumbMouseMove.bind(this),this._onScrollThumbMouseUpBound=this._onScrollThumbMouseUp.bind(this),this._onComponentMouseOverBound=this._onComponentMouseOver.bind(this),this._onComponentMouseOutBound=this._onComponentMouseOut.bind(this)}set scrollPos(t){this._scrollableContainer.scrollTop=t}get scrollPos(){return this._scrollableContainer?this._scrollableContainer.scrollTop:0}get scrollMax(){return this._scrollableContainer?this._scrollableContainer.scrollHeight:0}connectedCallback(){super.connectedCallback(),this._hostResizeObserver=new ResizeObserver(this._resizeObserverCallback),this._contentResizeObserver=new ResizeObserver(this._resizeObserverCallback),this.requestUpdate(),this.updateComplete.then((()=>{this._scrollableContainer.addEventListener("scroll",this._onScrollableContainerScroll.bind(this)),this._hostResizeObserver.observe(this),this._contentResizeObserver.observe(this._contentElement)})),this.addEventListener("mouseover",this._onComponentMouseOverBound),this.addEventListener("mouseout",this._onComponentMouseOutBound)}disconnectedCallback(){super.disconnectedCallback(),this._hostResizeObserver.unobserve(this),this._hostResizeObserver.disconnect(),this._contentResizeObserver.unobserve(this._contentElement),this._contentResizeObserver.disconnect(),this.removeEventListener("mouseover",this._onComponentMouseOverBound),this.removeEventListener("mouseout",this._onComponentMouseOutBound)}_updateScrollbar(){const t=this.getBoundingClientRect(),e=this._contentElement.getBoundingClientRect();t.height>=e.height?this._scrollbarVisible=!1:(this._scrollbarVisible=!0,this._thumbHeight=t.height*(t.height/e.height)),this.requestUpdate()}_zIndexFix(){let t=0;this._assignedElements.forEach((e=>{if("style"in e){const s=window.getComputedStyle(e).zIndex;/([0-9-])+/g.test(s)&&(t=Number(s)>t?Number(s):t)}})),this._scrollbarTrackZ=t+1,this.requestUpdate()}_onScrollThumbMouseDown(t){const e=this.getBoundingClientRect(),s=this._scrollThumbElement.getBoundingClientRect();this._mouseStartY=t.screenY,this._scrollThumbStartY=s.top-e.top,this._isDragging=!0,this._thumbActive=!0,document.addEventListener("mousemove",this._onScrollThumbMouseMoveBound),document.addEventListener("mouseup",this._onScrollThumbMouseUpBound)}_onScrollThumbMouseMove(t){const e=this._scrollThumbStartY+(t.screenY-this._mouseStartY);let s=0;const i=this.getBoundingClientRect().height,o=this._scrollThumbElement.getBoundingClientRect().height,r=this._contentElement.getBoundingClientRect().height;s=e<0?0:e>i-o?i-o:e,this._thumbY=s,this._scrollableContainer.scrollTop=s/(i-o)*(r-i)}_onScrollThumbMouseUp(t){this._isDragging=!1,this._thumbActive=!1;const e=this.getBoundingClientRect(),{x:s,y:i,width:o,height:r}=e,{pageX:n,pageY:a}=t;(n>s+o||n<s||a>i+r||a<i)&&(this._thumbFade=!0,this._thumbVisible=!1),document.removeEventListener("mousemove",this._onScrollThumbMouseMoveBound),document.removeEventListener("mouseup",this._onScrollThumbMouseUpBound)}_onScrollableContainerScroll(){const t=this._scrollableContainer.scrollTop;this.scrolled=t>0;const e=this.getBoundingClientRect().height,s=this._scrollThumbElement.getBoundingClientRect().height,i=t/(this._contentElement.getBoundingClientRect().height-e);this._thumbY=i*(e-s)}_onComponentMouseOver(){this._thumbVisible=!0,this._thumbFade=!1}_onComponentMouseOut(){this._thumbActive||(this._thumbVisible=!1,this._thumbFade=!0)}render(){return L`
      <div
        class="scrollable-container"
        .style=${It({userSelect:this._isDragging?"none":"auto"})}
      >
        <div
          class=${Et({shadow:!0,visible:this.scrolled})}
          .style=${It({zIndex:String(this._scrollbarTrackZ)})}
        ></div>
        ${this._isDragging?L`<div class="prevent-interaction"></div>`:q}
        <div
          class=${Et({"scrollbar-track":!0,hidden:!this._scrollbarVisible})}
        >
          <div
            class=${Et({"scrollbar-thumb":!0,visible:this._thumbVisible,fade:this._thumbFade,active:this._thumbActive})}
            .style=${It({height:`${this._thumbHeight}px`,top:`${this._thumbY}px`})}
            @mousedown=${this._onScrollThumbMouseDown}
          ></div>
        </div>
        <div class="content">
          <slot @slotchange=${this._onSlotChange}></slot>
        </div>
      </div>
    `}};ms.styles=fs,gs([dt({type:Boolean,reflect:!0})],ms.prototype,"shadow",void 0),gs([dt({type:Boolean,reflect:!0})],ms.prototype,"scrolled",void 0),gs([dt({type:Number,attribute:"scroll-pos"})],ms.prototype,"scrollPos",null),gs([dt({type:Number,attribute:"scroll-max"})],ms.prototype,"scrollMax",null),gs([ut()],ms.prototype,"_isDragging",void 0),gs([ut()],ms.prototype,"_thumbHeight",void 0),gs([ut()],ms.prototype,"_thumbY",void 0),gs([ut()],ms.prototype,"_thumbVisible",void 0),gs([ut()],ms.prototype,"_thumbFade",void 0),gs([ut()],ms.prototype,"_thumbActive",void 0),gs([pt(".content")],ms.prototype,"_contentElement",void 0),gs([pt(".scrollbar-thumb",!0)],ms.prototype,"_scrollThumbElement",void 0),gs([pt(".scrollable-container")],ms.prototype,"_scrollableContainer",void 0),gs([ft()],ms.prototype,"_assignedElements",void 0),ms=gs([yt("vscode-scrollable")],ms);const xs=[wt,n`
    :host {
      --separator-border: var(--vscode-editorWidget-border, #454545);

      border: 1px solid var(--vscode-editorWidget-border, #454545);
      display: block;
      overflow: hidden;
      position: relative;
    }

    ::slotted(*) {
      height: 100%;
      width: 100%;
    }

    ::slotted(vscode-split-layout) {
      border: 0;
    }

    .wrapper {
      display: flex;
      height: 100%;
      width: 100%;
    }

    .wrapper.horizontal {
      flex-direction: column;
    }

    .start {
      box-sizing: border-box;
      flex: 1;
      min-height: 0;
      min-width: 0;
    }

    :host([split='vertical']) .start {
      border-right: 1px solid var(--separator-border);
    }

    :host([split='horizontal']) .start {
      border-bottom: 1px solid var(--separator-border);
    }

    .end {
      flex: 1;
      min-height: 0;
      min-width: 0;
    }

    :host([split='vertical']) .start,
    :host([split='vertical']) .end {
      height: 100%;
    }

    :host([split='horizontal']) .start,
    :host([split='horizontal']) .end {
      width: 100%;
    }

    .handle-overlay {
      display: none;
      height: 100%;
      left: 0;
      position: absolute;
      top: 0;
      width: 100%;
      z-index: 1;
    }

    .handle-overlay.active {
      display: block;
    }

    .handle-overlay.split-vertical {
      cursor: ew-resize;
    }

    .handle-overlay.split-horizontal {
      cursor: ns-resize;
    }

    .handle {
      background-color: transparent;
      position: absolute;
      z-index: 2;
    }

    .handle.hover {
      transition: background-color 0.1s ease-out 0.3s;
      background-color: var(--vscode-sash-hoverBorder, #0078d4);
    }

    .handle.hide {
      background-color: transparent;
      transition: background-color 0.1s ease-out;
    }

    .handle.split-vertical {
      cursor: ew-resize;
      height: 100%;
    }

    .handle.split-horizontal {
      cursor: ns-resize;
      width: 100%;
    }
  `];var ys,ws=function(t,e,s,i){for(var o,r=arguments.length,n=r<3?e:null===i?i=Object.getOwnPropertyDescriptor(e,s):i,a=t.length-1;a>=0;a--)(o=t[a])&&(n=(r<3?o(n):r>3?o(e,s,n):o(e,s))||n);return r>3&&n&&Object.defineProperty(e,s,n),n};const ks=t=>{if(!t)return{value:0,unit:"pixel"};let e,s;t.endsWith("%")?(e="percent",s=+t.substring(0,t.length-1)):t.endsWith("px")?(e="pixel",s=+t.substring(0,t.length-2)):(e="pixel",s=+t);return{unit:e,value:isNaN(s)?0:s}},$s=(t,e)=>0===e?0:Math.min(100,t/e*100),_s=(t,e)=>e*(t/100);let Cs=ys=class extends xt{set split(t){this._split!==t&&(this._split=t,this.resetHandlePosition())}get split(){return this._split}set handlePosition(t){this._rawHandlePosition=t,this._handlePositionPropChanged()}get handlePosition(){return this._rawHandlePosition}set fixedPane(t){this._fixedPane=t,this._fixedPanePropChanged()}get fixedPane(){return this._fixedPane}constructor(){super(),this._split="vertical",this.resetOnDblClick=!1,this.handleSize=4,this.initialHandlePosition="50%",this._fixedPane="none",this._handlePosition=0,this._isDragActive=!1,this._hover=!1,this._hide=!1,this._boundRect=new DOMRect,this._handleOffset=0,this._wrapperObserved=!1,this._fixedPaneSize=0,this._handleResize=t=>{const e=t[0].contentRect,{width:s,height:i}=e;this._boundRect=e;const o="vertical"===this.split?s:i;"start"===this.fixedPane&&(this._handlePosition=this._fixedPaneSize),"end"===this.fixedPane&&(this._handlePosition=o-this._fixedPaneSize)},this._handleMouseUp=t=>{this._isDragActive=!1,t.target!==this&&(this._hover=!1,this._hide=!0),window.removeEventListener("mouseup",this._handleMouseUp),window.removeEventListener("mousemove",this._handleMouseMove);const{width:e,height:s}=this._boundRect,i="vertical"===this.split?e:s,o=$s(this._handlePosition,i);this.dispatchEvent(new CustomEvent("vsc-split-layout-change",{detail:{position:this._handlePosition,positionInPercentage:o},composed:!0}))},this._handleMouseMove=t=>{const{clientX:e,clientY:s}=t,{left:i,top:o,height:r,width:n}=this._boundRect,a="vertical"===this.split,c=a?n:r,l=a?e-i:s-o;this._handlePosition=Math.max(0,Math.min(l-this._handleOffset+this.handleSize/2,c)),"start"===this.fixedPane&&(this._fixedPaneSize=this._handlePosition),"end"===this.fixedPane&&(this._fixedPaneSize=c-this._handlePosition)},this._resizeObserver=new ResizeObserver(this._handleResize)}resetHandlePosition(){if(!this._wrapperEl)return void(this._handlePosition=0);const{width:t,height:e}=this._wrapperEl.getBoundingClientRect(),s="vertical"===this.split?t:e,{value:i,unit:o}=ks(this.initialHandlePosition??"50%");this._handlePosition="percent"===o?_s(i,s):i}connectedCallback(){super.connectedCallback()}firstUpdated(t){"none"!==this.fixedPane&&(this._resizeObserver.observe(this._wrapperEl),this._wrapperObserved=!0),this._boundRect=this._wrapperEl.getBoundingClientRect();const{value:e,unit:s}=this.handlePosition?ks(this.handlePosition):ks(this.initialHandlePosition);this._setPosition(e,s),this._initFixedPane()}_handlePositionPropChanged(){if(this.handlePosition&&this._wrapperEl){this._boundRect=this._wrapperEl.getBoundingClientRect();const{value:t,unit:e}=ks(this.handlePosition);this._setPosition(t,e)}}_fixedPanePropChanged(){this._wrapperEl&&this._initFixedPane()}_initFixedPane(){if("none"===this.fixedPane)this._wrapperObserved&&(this._resizeObserver.unobserve(this._wrapperEl),this._wrapperObserved=!1);else{const{width:t,height:e}=this._boundRect,s="vertical"===this.split?t:e;this._fixedPaneSize="start"===this.fixedPane?this._handlePosition:s-this._handlePosition,this._wrapperObserved||(this._resizeObserver.observe(this._wrapperEl),this._wrapperObserved=!0)}}_setPosition(t,e){const{width:s,height:i}=this._boundRect,o="vertical"===this.split?s:i;this._handlePosition="percent"===e?_s(t,o):t}_handleMouseOver(){this._hover=!0,this._hide=!1}_handleMouseOut(t){1!==t.buttons&&(this._hover=!1,this._hide=!0)}_handleMouseDown(t){t.stopPropagation(),t.preventDefault(),this._boundRect=this._wrapperEl.getBoundingClientRect();const{left:e,top:s}=this._boundRect,{left:i,top:o}=this._handleEl.getBoundingClientRect(),r=t.clientX-e,n=t.clientY-s;"vertical"===this.split&&(this._handleOffset=r-(i-e)),"horizontal"===this.split&&(this._handleOffset=n-(o-s)),this._isDragActive=!0,window.addEventListener("mouseup",this._handleMouseUp),window.addEventListener("mousemove",this._handleMouseMove)}_handleDblClick(){this.resetOnDblClick&&this.resetHandlePosition()}_handleSlotChange(){[...this._nestedLayoutsAtStart,...this._nestedLayoutsAtEnd].forEach((t=>{t instanceof ys&&t.resetHandlePosition()}))}render(){const{width:t,height:e}=this._boundRect,s="vertical"===this.split?t:e,i="none"!==this.fixedPane?`${this._handlePosition}px`:`${$s(this._handlePosition,s)}%`;let o="";o="start"===this.fixedPane?`0 0 ${this._fixedPaneSize}px`:`1 1 ${$s(this._handlePosition,s)}%`;let r="";r="end"===this.fixedPane?`0 0 ${this._fixedPaneSize}px`:`1 1 ${$s(s-this._handlePosition,s)}%`;const n={left:"vertical"===this.split?i:"0",top:"vertical"===this.split?"0":i},a=this.handleSize??4;"vertical"===this.split&&(n.marginLeft=0-a/2+"px",n.width=`${a}px`),"horizontal"===this.split&&(n.height=`${a}px`,n.marginTop=0-a/2+"px");const c=Et({"handle-overlay":!0,active:this._isDragActive,"split-vertical":"vertical"===this.split,"split-horizontal":"horizontal"===this.split}),l=Et({handle:!0,hover:this._hover,hide:this._hide,"split-vertical":"vertical"===this.split,"split-horizontal":"horizontal"===this.split}),h={wrapper:!0,horizontal:"horizontal"===this.split};return L`
      <div class=${Et(h)}>
        <div class="start" .style=${It({flex:o})}>
          <slot name="start" @slotchange=${this._handleSlotChange}></slot>
        </div>
        <div class="end" .style=${It({flex:r})}>
          <slot name="end" @slotchange=${this._handleSlotChange}></slot>
        </div>
        <div class=${c}></div>
        <div
          class=${l}
          .style=${It(n)}
          @mouseover=${this._handleMouseOver}
          @mouseout=${this._handleMouseOut}
          @mousedown=${this._handleMouseDown}
          @dblclick=${this._handleDblClick}
        ></div>
      </div>
    `}};Cs.styles=xs,ws([dt({reflect:!0})],Cs.prototype,"split",null),ws([dt({type:Boolean,reflect:!0,attribute:"reset-on-dbl-click"})],Cs.prototype,"resetOnDblClick",void 0),ws([dt({type:Number,reflect:!0,attribute:"handle-size"})],Cs.prototype,"handleSize",void 0),ws([dt({reflect:!0,attribute:"initial-handle-position"})],Cs.prototype,"initialHandlePosition",void 0),ws([dt({attribute:"handle-position"})],Cs.prototype,"handlePosition",null),ws([dt({attribute:"fixed-pane"})],Cs.prototype,"fixedPane",null),ws([ut()],Cs.prototype,"_handlePosition",void 0),ws([ut()],Cs.prototype,"_isDragActive",void 0),ws([ut()],Cs.prototype,"_hover",void 0),ws([ut()],Cs.prototype,"_hide",void 0),ws([pt(".wrapper")],Cs.prototype,"_wrapperEl",void 0),ws([pt(".handle")],Cs.prototype,"_handleEl",void 0),ws([ft({slot:"start",selector:"vscode-split-layout"})],Cs.prototype,"_nestedLayoutsAtStart",void 0),ws([ft({slot:"end",selector:"vscode-split-layout"})],Cs.prototype,"_nestedLayoutsAtEnd",void 0),Cs=ys=ws([yt("vscode-split-layout")],Cs);const Bs=[wt,n`
    :host {
      border-bottom: 1px solid transparent;
      cursor: pointer;
      display: block;
      margin-bottom: -1px;
      overflow: hidden;
      padding: 7px 8px;
      text-overflow: ellipsis;
      user-select: none;
      white-space: nowrap;
    }

    :host([active]) {
      border-bottom-color: var(--vscode-panelTitle-activeForeground);
      color: var(--vscode-panelTitle-activeForeground);
    }

    :host([panel]) {
      border-bottom: 0;
      margin-bottom: 0;
      padding: 0;
    }

    :host(:focus-visible) {
      outline: none;
    }

    .wrapper {
      align-items: center;
      color: var(--vscode-foreground);
      display: flex;
      min-height: 20px;
      overflow: inherit;
      text-overflow: inherit;
      position: relative;
    }

    .wrapper.panel {
      color: var(--vscode-panelTitle-inactiveForeground);
    }

    .wrapper.panel.active,
    .wrapper.panel:hover {
      color: var(--vscode-panelTitle-activeForeground);
    }

    :host([panel]) .wrapper {
      display: flex;
      font-size: 11px;
      height: 31px;
      padding: 2px 10px;
      text-transform: uppercase;
    }

    .main {
      overflow: inherit;
      text-overflow: inherit;
    }

    .active-indicator {
      display: none;
    }

    .active-indicator.panel.active {
      border-top: 1px solid var(--vscode-panelTitle-activeBorder);
      bottom: 4px;
      display: block;
      left: 8px;
      pointer-events: none;
      position: absolute;
      right: 8px;
    }

    :host(:focus-visible) .wrapper {
      outline-color: var(--vscode-focusBorder);
      outline-offset: 3px;
      outline-style: solid;
      outline-width: 1px;
    }

    :host(:focus-visible) .wrapper.panel {
      outline-offset: -2px;
    }

    slot[name='content-before']::slotted(vscode-badge) {
      margin-right: 8px;
    }

    slot[name='content-after']::slotted(vscode-badge) {
      margin-left: 8px;
    }
  `];var Ss=function(t,e,s,i){for(var o,r=arguments.length,n=r<3?e:null===i?i=Object.getOwnPropertyDescriptor(e,s):i,a=t.length-1;a>=0;a--)(o=t[a])&&(n=(r<3?o(n):r>3?o(e,s,n):o(e,s))||n);return r>3&&n&&Object.defineProperty(e,s,n),n};let zs=class extends xt{constructor(){super(...arguments),this.active=!1,this.ariaControls="",this.panel=!1,this.role="tab",this.tabId=-1}attributeChangedCallback(t,e,s){if(super.attributeChangedCallback(t,e,s),"active"===t){const t=null!==s;this.ariaSelected=t?"true":"false",this.tabIndex=t?0:-1}}render(){return L`
      <div
        class=${Et({wrapper:!0,active:this.active,panel:this.panel})}
      >
        <div class="before"><slot name="content-before"></slot></div>
        <div class="main"><slot></slot></div>
        <div class="after"><slot name="content-after"></slot></div>
        <span
          class=${Et({"active-indicator":!0,active:this.active,panel:this.panel})}
        ></span>
      </div>
    `}};zs.styles=Bs,Ss([dt({type:Boolean,reflect:!0})],zs.prototype,"active",void 0),Ss([dt({reflect:!0,attribute:"aria-controls"})],zs.prototype,"ariaControls",void 0),Ss([dt({type:Boolean,reflect:!0})],zs.prototype,"panel",void 0),Ss([dt({reflect:!0})],zs.prototype,"role",void 0),Ss([dt({type:Number,reflect:!0,attribute:"tab-id"})],zs.prototype,"tabId",void 0),zs=Ss([yt("vscode-tab-header")],zs);const Os=[wt,n`
    :host {
      display: block;
      overflow: hidden;
    }

    :host(:focus-visible) {
      outline-color: var(--vscode-focusBorder);
      outline-offset: 3px;
      outline-style: solid;
      outline-width: 1px;
    }

    :host([panel]) {
      background-color: var(--vscode-panel-background);
    }
  `];var As=function(t,e,s,i){for(var o,r=arguments.length,n=r<3?e:null===i?i=Object.getOwnPropertyDescriptor(e,s):i,a=t.length-1;a>=0;a--)(o=t[a])&&(n=(r<3?o(n):r>3?o(e,s,n):o(e,s))||n);return r>3&&n&&Object.defineProperty(e,s,n),n};let Es=class extends xt{constructor(){super(...arguments),this.hidden=!1,this.ariaLabelledby="",this.panel=!1,this.role="tabpanel",this.tabIndex=0}render(){return L` <slot></slot> `}};Es.styles=Os,As([dt({type:Boolean,reflect:!0})],Es.prototype,"hidden",void 0),As([dt({reflect:!0,attribute:"aria-labelledby"})],Es.prototype,"ariaLabelledby",void 0),As([dt({type:Boolean,reflect:!0})],Es.prototype,"panel",void 0),As([dt({reflect:!0})],Es.prototype,"role",void 0),As([dt({type:Number,reflect:!0})],Es.prototype,"tabIndex",void 0),Es=As([yt("vscode-tab-panel")],Es);const js=[wt,n`
    :host {
      display: table;
      table-layout: fixed;
      width: 100%;
    }

    ::slotted(vscode-table-row:nth-child(even)) {
      background-color: var(--vsc-row-even-background);
    }

    ::slotted(vscode-table-row:nth-child(odd)) {
      background-color: var(--vsc-row-odd-background);
    }
  `];var Is=function(t,e,s,i){for(var o,r=arguments.length,n=r<3?e:null===i?i=Object.getOwnPropertyDescriptor(e,s):i,a=t.length-1;a>=0;a--)(o=t[a])&&(n=(r<3?o(n):r>3?o(e,s,n):o(e,s))||n);return r>3&&n&&Object.defineProperty(e,s,n),n};let Ms=class extends xt{constructor(){super(...arguments),this.role="rowgroup"}render(){return L` <slot></slot> `}};Ms.styles=js,Is([dt({reflect:!0})],Ms.prototype,"role",void 0),Ms=Is([yt("vscode-table-body")],Ms);const Fs=[wt,n`
    :host {
      border-bottom-color: var(--vscode-editorGroup-border);
      border-bottom-style: solid;
      border-bottom-width: var(--vsc-row-border-bottom-width);
      box-sizing: border-box;
      color: var(--vscode-foreground);
      display: table-cell;
      font-family: var(--vscode-font-family);
      font-size: var(--vscode-font-size);
      height: 24px;
      overflow: hidden;
      padding-left: 10px;
      text-overflow: ellipsis;
      vertical-align: middle;
      white-space: nowrap;
    }

    :host([compact]) {
      display: block;
      height: auto;
      padding-bottom: 5px;
      width: 100% !important;
    }

    :host([compact]:first-child) {
      padding-top: 10px;
    }

    :host([compact]:last-child) {
      padding-bottom: 10px;
    }

    .wrapper {
      overflow: inherit;
      text-overflow: inherit;
      white-space: inherit;
      width: 100%;
    }

    .column-label {
      font-weight: bold;
    }
  `];var Ps=function(t,e,s,i){for(var o,r=arguments.length,n=r<3?e:null===i?i=Object.getOwnPropertyDescriptor(e,s):i,a=t.length-1;a>=0;a--)(o=t[a])&&(n=(r<3?o(n):r>3?o(e,s,n):o(e,s))||n);return r>3&&n&&Object.defineProperty(e,s,n),n};let Ns=class extends xt{constructor(){super(...arguments),this.role="cell",this.columnLabel="",this.compact=!1}render(){const t=this.columnLabel?L`<div class="column-label" role="presentation">
          ${this.columnLabel}
        </div>`:q;return L`
      <div class="wrapper">
        ${t}
        <slot></slot>
      </div>
    `}};Ns.styles=Fs,Ps([dt({reflect:!0})],Ns.prototype,"role",void 0),Ps([dt({attribute:"column-label"})],Ns.prototype,"columnLabel",void 0),Ps([dt({type:Boolean,reflect:!0})],Ns.prototype,"compact",void 0),Ns=Ps([yt("vscode-table-cell")],Ns);const Ds=[wt,n`
    :host {
      background-color: var(--vscode-keybindingTable-headerBackground);
      display: table;
      table-layout: fixed;
      width: 100%;
    }
  `];var Vs=function(t,e,s,i){for(var o,r=arguments.length,n=r<3?e:null===i?i=Object.getOwnPropertyDescriptor(e,s):i,a=t.length-1;a>=0;a--)(o=t[a])&&(n=(r<3?o(n):r>3?o(e,s,n):o(e,s))||n);return r>3&&n&&Object.defineProperty(e,s,n),n};let Rs=class extends xt{constructor(){super(...arguments),this.role="rowgroup"}render(){return L` <slot></slot> `}};Rs.styles=Ds,Vs([dt({reflect:!0})],Rs.prototype,"role",void 0),Rs=Vs([yt("vscode-table-header")],Rs);const Ts=[wt,n`
    :host {
      box-sizing: border-box;
      color: var(--vscode-foreground);
      display: table-cell;
      font-family: var(--vscode-font-family);
      font-size: var(--vscode-font-size);
      font-weight: bold;
      line-height: 20px;
      overflow: hidden;
      padding-bottom: 5px;
      padding-left: 10px;
      padding-right: 0;
      padding-top: 5px;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .wrapper {
      box-sizing: inherit;
      overflow: inherit;
      text-overflow: inherit;
      white-space: inherit;
      width: 100%;
    }
  `];var Ls=function(t,e,s,i){for(var o,r=arguments.length,n=r<3?e:null===i?i=Object.getOwnPropertyDescriptor(e,s):i,a=t.length-1;a>=0;a--)(o=t[a])&&(n=(r<3?o(n):r>3?o(e,s,n):o(e,s))||n);return r>3&&n&&Object.defineProperty(e,s,n),n};let Us=class extends xt{constructor(){super(...arguments),this.role="columnheader"}render(){return L`
      <div class="wrapper">
        <slot></slot>
      </div>
    `}};Us.styles=Ts,Ls([dt({reflect:!0})],Us.prototype,"role",void 0),Us=Ls([yt("vscode-table-header-cell")],Us);const qs=[wt,n`
    :host {
      border-top-color: var(--vscode-editorGroup-border);
      border-top-style: solid;
      border-top-width: var(--vsc-row-border-top-width);
      display: var(--vsc-row-display);
      width: 100%;
    }
  `];var Hs=function(t,e,s,i){for(var o,r=arguments.length,n=r<3?e:null===i?i=Object.getOwnPropertyDescriptor(e,s):i,a=t.length-1;a>=0;a--)(o=t[a])&&(n=(r<3?o(n):r>3?o(e,s,n):o(e,s))||n);return r>3&&n&&Object.defineProperty(e,s,n),n};let Ks=class extends xt{constructor(){super(...arguments),this.role="row"}render(){return L` <slot></slot> `}};Ks.styles=qs,Hs([dt({reflect:!0})],Ks.prototype,"role",void 0),Ks=Hs([yt("vscode-table-row")],Ks);const Ws=(t,e)=>{if("number"!=typeof t||Number.isNaN(t)){if("string"==typeof t&&/^[0-9.]+$/.test(t)){return Number(t)/e*100}if("string"==typeof t&&/^[0-9.]+%$/.test(t))return Number(t.substring(0,t.length-1));if("string"==typeof t&&/^[0-9.]+px$/.test(t)){return Number(t.substring(0,t.length-2))/e*100}return null}return t/e*100},Gs=[wt,n`
    :host {
      display: block;
      --vsc-row-even-background: transparent;
      --vsc-row-odd-background: transparent;
      --vsc-row-border-bottom-width: 0;
      --vsc-row-border-top-width: 0;
      --vsc-row-display: table-row;
    }

    :host([bordered]),
    :host([bordered-rows]) {
      --vsc-row-border-bottom-width: 1px;
    }

    :host([compact]) {
      --vsc-row-display: block;
    }

    :host([bordered][compact]),
    :host([bordered-rows][compact]) {
      --vsc-row-border-bottom-width: 0;
      --vsc-row-border-top-width: 1px;
    }

    :host([zebra]) {
      --vsc-row-even-background: var(--vscode-keybindingTable-rowsBackground);
    }

    :host([zebra-odd]) {
      --vsc-row-odd-background: var(--vscode-keybindingTable-rowsBackground);
    }

    ::slotted(vscode-table-row) {
      width: 100%;
    }

    .wrapper {
      height: 100%;
      max-width: 100%;
      overflow: hidden;
      position: relative;
      width: 100%;
    }

    .wrapper.select-disabled {
      user-select: none;
    }

    .wrapper.resize-cursor {
      cursor: ew-resize;
    }

    .wrapper.compact-view .header-slot-wrapper {
      height: 0;
      overflow: hidden;
    }

    .scrollable {
      height: 100%;
    }

    .scrollable:before {
      background-color: transparent;
      content: '';
      display: block;
      height: 1px;
      position: absolute;
      width: 100%;
    }

    .wrapper:not(.compact-view) .scrollable:not([scrolled]):before {
      background-color: var(--vscode-editorGroup-border);
    }

    .sash {
      visibility: hidden;
    }

    :host([bordered-columns]) .sash,
    :host([bordered]) .sash {
      visibility: visible;
    }

    :host([resizable]) .wrapper:hover .sash {
      visibility: visible;
    }

    .sash {
      height: 100%;
      position: absolute;
      top: 0;
      width: 1px;
    }

    .wrapper.compact-view .sash {
      display: none;
    }

    .sash.resizable {
      cursor: ew-resize;
    }

    .sash-visible {
      background-color: var(--vscode-editorGroup-border);
      height: 100%;
      position: absolute;
      top: 30px;
      width: 1px;
    }

    .sash.hover .sash-visible {
      background-color: var(--vscode-sash-hoverBorder);
      transition: background-color 50ms linear 300ms;
    }

    .sash .sash-clickable {
      background-color: transparent;
      height: 100%;
      left: -2px;
      position: absolute;
      width: 5px;
    }
  `];var Js=function(t,e,s,i){for(var o,r=arguments.length,n=r<3?e:null===i?i=Object.getOwnPropertyDescriptor(e,s):i,a=t.length-1;a>=0;a--)(o=t[a])&&(n=(r<3?o(n):r>3?o(e,s,n):o(e,s))||n);return r>3&&n&&Object.defineProperty(e,s,n),n};let Ys=class extends xt{constructor(){super(...arguments),this.role="table",this.resizable=!1,this.responsive=!1,this.bordered=!1,this.borderedColumns=!1,this.borderedRows=!1,this.breakpoint=300,this.minColumnWidth="50px",this.delayedResizing=!1,this.compact=!1,this.zebra=!1,this.zebraOdd=!1,this._sashPositions=[],this._isDragging=!1,this._sashHovers=[],this._columns=[],this._activeSashElementIndex=-1,this._activeSashCursorOffset=0,this._componentX=0,this._componentH=0,this._componentW=0,this._headerCells=[],this._cellsOfFirstRow=[],this._prevHeaderHeight=0,this._prevComponentHeight=0,this._componentResizeObserverCallback=()=>{this._memoizeComponentDimensions(),this._updateResizeHandlersSize(),this.responsive&&this._toggleCompactView(),this._resizeTableBody()},this._headerResizeObserverCallback=()=>{this._updateResizeHandlersSize()},this._bodyResizeObserverCallback=()=>{this._resizeTableBody()},this._onResizingMouseMove=t=>{t.stopPropagation(),this._updateActiveSashPosition(t.pageX),this.delayedResizing?this._resizeColumns(!1):this._resizeColumns(!0)},this._onResizingMouseUp=t=>{this._resizeColumns(!0),this._updateActiveSashPosition(t.pageX),this._sashHovers[this._activeSashElementIndex]=!1,this._isDragging=!1,this._activeSashElementIndex=-1,document.removeEventListener("mousemove",this._onResizingMouseMove),document.removeEventListener("mouseup",this._onResizingMouseUp)}}set columns(t){this._columns=t,this.isConnected&&this._initDefaultColumnSizes()}get columns(){return this._columns}connectedCallback(){super.connectedCallback(),this._memoizeComponentDimensions(),this._initDefaultColumnSizes()}disconnectedCallback(){super.disconnectedCallback(),this._componentResizeObserver?.unobserve(this),this._componentResizeObserver?.disconnect(),this._bodyResizeObserver?.disconnect()}_px2Percent(t){return t/this._componentW*100}_percent2Px(t){return this._componentW*t/100}_memoizeComponentDimensions(){const t=this.getBoundingClientRect();this._componentH=t.height,this._componentW=t.width,this._componentX=t.x}_queryHeaderCells(){const t=this._assignedHeaderElements;return t&&t[0]?Array.from(t[0].querySelectorAll("vscode-table-header-cell")):[]}_getHeaderCells(){return this._headerCells.length||(this._headerCells=this._queryHeaderCells()),this._headerCells}_queryCellsOfFirstRow(){const t=this._assignedBodyElements;return t&&t[0]?Array.from(t[0].querySelectorAll("vscode-table-row:first-child vscode-table-cell")):[]}_getCellsOfFirstRow(){return this._cellsOfFirstRow.length||(this._cellsOfFirstRow=this._queryCellsOfFirstRow()),this._cellsOfFirstRow}_resizeTableBody(){let t=0,e=0;const s=this.getBoundingClientRect().height;this._assignedHeaderElements&&this._assignedHeaderElements.length&&(t=this._assignedHeaderElements[0].getBoundingClientRect().height),this._assignedBodyElements&&this._assignedBodyElements.length&&(e=this._assignedBodyElements[0].getBoundingClientRect().height);const i=e-t-s;this._scrollableElement.style.height=i>0?s-t+"px":"auto"}_initResizeObserver(){this._componentResizeObserver=new ResizeObserver(this._componentResizeObserverCallback),this._componentResizeObserver.observe(this),this._headerResizeObserver=new ResizeObserver(this._headerResizeObserverCallback),this._headerResizeObserver.observe(this._headerElement)}_calcColWidthPercentages(){const t=this._getHeaderCells().length;let e=this.columns.slice(0,t);const s=e.filter((t=>"auto"===t)).length+t-e.length;let i=100;if(e=e.map((t=>{const e=Ws(t,this._componentW);return null===e?"auto":(i-=e,e)})),e.length<t)for(let s=e.length;s<t;s++)e.push("auto");return e=e.map((t=>"auto"===t?i/s:t)),e}_initHeaderCellSizes(t){this._getHeaderCells().forEach(((e,s)=>{e.style.width=`${t[s]}%`}))}_initBodyColumnSizes(t){this._getCellsOfFirstRow().forEach(((e,s)=>{e.style.width=`${t[s]}%`}))}_initSashes(t){const e=t.length;let s=0;this._sashPositions=[],t.forEach(((t,i)=>{if(i<e-1){const e=s+t;this._sashPositions.push(e),s=e}}))}_initDefaultColumnSizes(){const t=this._calcColWidthPercentages();this._initHeaderCellSizes(t),this._initBodyColumnSizes(t),this._initSashes(t)}_updateResizeHandlersSize(){const t=this._headerElement.getBoundingClientRect();if(t.height===this._prevHeaderHeight&&this._componentH===this._prevComponentHeight)return;this._prevHeaderHeight=t.height,this._prevComponentHeight=this._componentH;const e=this._componentH-t.height;this._sashVisibleElements.forEach((s=>{s.style.height=`${e}px`,s.style.top=`${t.height}px`}))}_applyCompactViewColumnLabels(){const t=this._getHeaderCells().map((t=>t.innerText));this.querySelectorAll("vscode-table-row").forEach((e=>{e.querySelectorAll("vscode-table-cell").forEach(((e,s)=>{e.columnLabel=t[s],e.compact=!0}))}))}_clearCompactViewColumnLabels(){this.querySelectorAll("vscode-table-cell").forEach((t=>{t.columnLabel="",t.compact=!1}))}_toggleCompactView(){const t=this.getBoundingClientRect().width<this.breakpoint;this.compact!==t&&(this.compact=t,t?this._applyCompactViewColumnLabels():this._clearCompactViewColumnLabels())}_onDefaultSlotChange(){this._assignedElements.forEach((t=>{"vscode-table-header"!==t.tagName.toLowerCase()?"vscode-table-body"!==t.tagName.toLowerCase()||(t.slot="body"):t.slot="header"}))}_onHeaderSlotChange(){this._headerCells=this._queryHeaderCells()}_onBodySlotChange(){if(this._initDefaultColumnSizes(),this._initResizeObserver(),this._updateResizeHandlersSize(),!this._bodyResizeObserver){const t=this._assignedBodyElements[0]??null;t&&(this._bodyResizeObserver=new ResizeObserver(this._bodyResizeObserverCallback),this._bodyResizeObserver.observe(t))}}_onSashMouseOver(t){if(this._isDragging)return;const e=t.currentTarget,s=Number(e.dataset.index);this._sashHovers[s]=!0,this.requestUpdate()}_onSashMouseOut(t){if(t.stopPropagation(),this._isDragging)return;const e=t.currentTarget,s=Number(e.dataset.index);this._sashHovers[s]=!1,this.requestUpdate()}_onSashMouseDown(t){t.stopPropagation();const{pageX:e,currentTarget:s}=t,i=s,o=Number(i.dataset.index),r=i.getBoundingClientRect().x;this._isDragging=!0,this._activeSashElementIndex=o,this._sashHovers[this._activeSashElementIndex]=!0,this._activeSashCursorOffset=this._px2Percent(e-r);const n=this._getHeaderCells();this._headerCellsToResize=[],this._headerCellsToResize.push(n[o]),n[o+1]&&(this._headerCellsToResize[1]=n[o+1]);const a=this._bodySlot.assignedElements()[0].querySelectorAll("vscode-table-row:first-child > vscode-table-cell");this._cellsToResize=[],this._cellsToResize.push(a[o]),a[o+1]&&this._cellsToResize.push(a[o+1]),document.addEventListener("mousemove",this._onResizingMouseMove),document.addEventListener("mouseup",this._onResizingMouseUp)}_updateActiveSashPosition(t){const{prevSashPos:e,nextSashPos:s}=this._getSashPositions();let i=Ws(this.minColumnWidth,this._componentW);null===i&&(i=0);const o=e?e+i:i,r=s?s-i:100-i;let n=this._px2Percent(t-this._componentX-this._percent2Px(this._activeSashCursorOffset));n=Math.max(n,o),n=Math.min(n,r),this._sashPositions[this._activeSashElementIndex]=n,this.requestUpdate()}_getSashPositions(){return{sashPos:this._sashPositions[this._activeSashElementIndex],prevSashPos:this._sashPositions[this._activeSashElementIndex-1]||0,nextSashPos:this._sashPositions[this._activeSashElementIndex+1]||100}}_resizeColumns(t=!0){const{sashPos:e,prevSashPos:s,nextSashPos:i}=this._getSashPositions(),o=`${e-s}%`,r=`${i-e}%`;this._headerCellsToResize[0].style.width=o,this._headerCellsToResize[1]&&(this._headerCellsToResize[1].style.width=r),t&&(this._cellsToResize[0].style.width=o,this._cellsToResize[1]&&(this._cellsToResize[1].style.width=r))}render(){const t=this._sashPositions.map(((t,e)=>{const s=Et({sash:!0,hover:this._sashHovers[e],resizable:this.resizable}),i=`${t}%`;return this.resizable?L`
            <div
              class=${s}
              data-index=${e}
              .style=${It({left:i})}
              @mousedown=${this._onSashMouseDown}
              @mouseover=${this._onSashMouseOver}
              @mouseout=${this._onSashMouseOut}
            >
              <div class="sash-visible"></div>
              <div class="sash-clickable"></div>
            </div>
          `:L`<div
            class=${s}
            data-index=${e}
            .style=${It({left:i})}
          >
            <div class="sash-visible"></div>
          </div>`})),e=Et({wrapper:!0,"select-disabled":this._isDragging,"resize-cursor":this._isDragging,"compact-view":this.compact});return L`
      <div class=${e}>
        <div class="header">
          <slot name="caption"></slot>
          <div class="header-slot-wrapper">
            <slot name="header" @slotchange=${this._onHeaderSlotChange}></slot>
          </div>
        </div>
        <vscode-scrollable class="scrollable">
          <div>
            <slot name="body" @slotchange=${this._onBodySlotChange}></slot>
          </div>
        </vscode-scrollable>
        ${t}
        <slot @slotchange=${this._onDefaultSlotChange}></slot>
      </div>
    `}};Ys.styles=Gs,Js([dt({reflect:!0})],Ys.prototype,"role",void 0),Js([dt({type:Boolean,reflect:!0})],Ys.prototype,"resizable",void 0),Js([dt({type:Boolean,reflect:!0})],Ys.prototype,"responsive",void 0),Js([dt({type:Boolean,reflect:!0})],Ys.prototype,"bordered",void 0),Js([dt({type:Boolean,reflect:!0,attribute:"bordered-columns"})],Ys.prototype,"borderedColumns",void 0),Js([dt({type:Boolean,reflect:!0,attribute:"bordered-rows"})],Ys.prototype,"borderedRows",void 0),Js([dt({type:Number})],Ys.prototype,"breakpoint",void 0),Js([dt({type:Array})],Ys.prototype,"columns",null),Js([dt({attribute:"min-column-width"})],Ys.prototype,"minColumnWidth",void 0),Js([dt({type:Boolean,reflect:!0,attribute:"delayed-resizing"})],Ys.prototype,"delayedResizing",void 0),Js([dt({type:Boolean,reflect:!0})],Ys.prototype,"compact",void 0),Js([dt({type:Boolean,reflect:!0})],Ys.prototype,"zebra",void 0),Js([dt({type:Boolean,reflect:!0,attribute:"zebra-odd"})],Ys.prototype,"zebraOdd",void 0),Js([pt('slot[name="body"]')],Ys.prototype,"_bodySlot",void 0),Js([pt(".header")],Ys.prototype,"_headerElement",void 0),Js([pt(".scrollable")],Ys.prototype,"_scrollableElement",void 0),Js([function(t){return(e,s)=>vt(0,0,{get(){return(this.renderRoot??(bt??=document.createDocumentFragment())).querySelectorAll(t)}})}(".sash-visible")],Ys.prototype,"_sashVisibleElements",void 0),Js([ft({flatten:!0,selector:"vscode-table-header, vscode-table-body"})],Ys.prototype,"_assignedElements",void 0),Js([ft({slot:"header",flatten:!0,selector:"vscode-table-header"})],Ys.prototype,"_assignedHeaderElements",void 0),Js([ft({slot:"body",flatten:!0,selector:"vscode-table-body"})],Ys.prototype,"_assignedBodyElements",void 0),Js([ut()],Ys.prototype,"_sashPositions",void 0),Js([ut()],Ys.prototype,"_isDragging",void 0),Ys=Js([yt("vscode-table")],Ys);const Xs=[wt,n`
    :host {
      display: block;
    }

    .header {
      align-items: center;
      display: flex;
      font-family: var(--vscode-font-family);
      font-size: var(--vscode-font-size);
      font-weight: var(--vscode-font-weight);
      width: 100%;
    }

    .header {
      border-bottom-color: var(--vscode-settings-headerBorder);
      border-bottom-style: solid;
      border-bottom-width: 1px;
    }

    .header.panel {
      background-color: var(--vscode-panel-background);
      border-bottom-width: 0;
      box-sizing: border-box;
      padding-left: 8px;
      padding-right: 8px;
    }

    slot[name='addons'] {
      display: block;
      margin-left: auto;
    }
  `];var Zs=function(t,e,s,i){for(var o,r=arguments.length,n=r<3?e:null===i?i=Object.getOwnPropertyDescriptor(e,s):i,a=t.length-1;a>=0;a--)(o=t[a])&&(n=(r<3?o(n):r>3?o(e,s,n):o(e,s))||n);return r>3&&n&&Object.defineProperty(e,s,n),n};let Qs=class extends xt{constructor(){super(),this.panel=!1,this.role="tablist",this.selectedIndex=0,this._tabHeaders=[],this._tabPanels=[],this._componentId="",this._tabFocus=0,this._componentId=Se()}attributeChangedCallback(t,e,s){super.attributeChangedCallback(t,e,s),"selected-index"===t&&this._setActiveTab(),"panel"===t&&(this._tabHeaders.forEach((t=>t.panel=null!==s)),this._tabPanels.forEach((t=>t.panel=null!==s)))}_dispatchSelectEvent(){this.dispatchEvent(new CustomEvent("vsc-select",{detail:{selectedIndex:this.selectedIndex},composed:!0})),this.dispatchEvent(new CustomEvent("vsc-tabs-select",{detail:{selectedIndex:this.selectedIndex},composed:!0}))}_setActiveTab(){this._tabFocus=this.selectedIndex,this._tabPanels.forEach(((t,e)=>{t.hidden=e!==this.selectedIndex})),this._tabHeaders.forEach(((t,e)=>{t.active=e===this.selectedIndex}))}_focusPrevTab(){0===this._tabFocus?this._tabFocus=this._tabHeaders.length-1:this._tabFocus-=1}_focusNextTab(){this._tabFocus===this._tabHeaders.length-1?this._tabFocus=0:this._tabFocus+=1}_onHeaderKeyDown(t){"ArrowLeft"!==t.key&&"ArrowRight"!==t.key||(t.preventDefault(),this._tabHeaders[this._tabFocus].setAttribute("tabindex","-1"),"ArrowLeft"===t.key?this._focusPrevTab():"ArrowRight"===t.key&&this._focusNextTab(),this._tabHeaders[this._tabFocus].setAttribute("tabindex","0"),this._tabHeaders[this._tabFocus].focus()),"Enter"===t.key&&(t.preventDefault(),this.selectedIndex=this._tabFocus,this._dispatchSelectEvent())}_moveHeadersToHeaderSlot(){const t=this._mainSlotElements.filter((t=>t instanceof zs));t.length>0&&t.forEach((t=>t.setAttribute("slot","header")))}_onMainSlotChange(){this._moveHeadersToHeaderSlot(),this._tabPanels=this._mainSlotElements.filter((t=>t instanceof Es)),this._tabPanels.forEach(((t,e)=>{t.ariaLabelledby=`t${this._componentId}-h${e}`,t.id=`t${this._componentId}-p${e}`,t.panel=this.panel})),this._setActiveTab()}_onHeaderSlotChange(){this._tabHeaders=this._headerSlotElements.filter((t=>t instanceof zs)),this._tabHeaders.forEach(((t,e)=>{t.tabId=e,t.id=`t${this._componentId}-h${e}`,t.ariaControls=`t${this._componentId}-p${e}`,t.panel=this.panel,t.active=e===this.selectedIndex}))}_onHeaderClick(t){const e=t.composedPath().find((t=>t instanceof zs));e&&(this.selectedIndex=e.tabId,this._setActiveTab(),this._dispatchSelectEvent())}render(){return L`
      <div
        class=${Et({header:!0,panel:this.panel})}
        @click=${this._onHeaderClick}
        @keydown=${this._onHeaderKeyDown}
      >
        <slot name="header" @slotchange=${this._onHeaderSlotChange}></slot>
        <slot name="addons"></slot>
      </div>
      <slot @slotchange=${this._onMainSlotChange}></slot>
    `}};Qs.styles=Xs,Zs([dt({type:Boolean,reflect:!0})],Qs.prototype,"panel",void 0),Zs([dt({reflect:!0})],Qs.prototype,"role",void 0),Zs([dt({type:Number,reflect:!0,attribute:"selected-index"})],Qs.prototype,"selectedIndex",void 0),Zs([ft({slot:"header"})],Qs.prototype,"_headerSlotElements",void 0),Zs([ft()],Qs.prototype,"_mainSlotElements",void 0),Qs=Zs([yt("vscode-tabs")],Qs);const ti=[wt,n`
    :host {
      display: inline-flex;
    }

    button {
      align-items: center;
      background-color: transparent;
      border: 0;
      border-radius: 5px;
      color: var(--vscode-foreground, #cccccc);
      cursor: pointer;
      display: flex;
      outline-offset: -1px;
      outline-width: 1px;
      padding: 0;
      user-select: none;
    }

    button:focus-visible {
      outline-color: var(--vscode-focusBorder, #0078d4);
      outline-style: solid;
    }

    button:hover {
      background-color: var(
        --vscode-toolbar-hoverBackground,
        rgba(90, 93, 94, 0.31)
      );
      outline-style: dashed;
      outline-color: var(--vscode-toolbar-hoverOutline, transparent);
    }

    button:active {
      background-color: var(
        --vscode-toolbar-activeBackground,
        rgba(99, 102, 103, 0.31)
      );
    }

    button.checked {
      background-color: var(
        --vscode-inputOption-activeBackground,
        rgba(36, 137, 219, 0.51)
      );
      outline-color: var(--vscode-inputOption-activeBorder, #2488db);
      outline-style: solid;
      color: var(--vscode-inputOption-activeForeground, #ffffff);
    }

    button.checked vscode-icon {
      color: var(--vscode-inputOption-activeForeground, #ffffff);
    }

    vscode-icon {
      display: block;
      padding: 3px;
    }

    slot:not(.empty) {
      align-items: center;
      display: flex;
      height: 22px;
      padding: 0 5px 0 2px;
    }

    slot.textOnly:not(.empty) {
      padding: 0 5px;
    }
  `];var ei=function(t,e,s,i){for(var o,r=arguments.length,n=r<3?e:null===i?i=Object.getOwnPropertyDescriptor(e,s):i,a=t.length-1;a>=0;a--)(o=t[a])&&(n=(r<3?o(n):r>3?o(e,s,n):o(e,s))||n);return r>3&&n&&Object.defineProperty(e,s,n),n};let si=class extends xt{constructor(){super(...arguments),this.icon="",this.label=void 0,this.toggleable=!1,this.checked=!1,this._isSlotEmpty=!0}_handleSlotChange(){this._isSlotEmpty=!((this._assignedNodes?.length??0)>0)}_handleButtonClick(){this.toggleable&&(this.checked=!this.checked,this.dispatchEvent(new Event("change")))}render(){const t=this.checked?"true":"false";return L`
      <button
        type="button"
        aria-label=${jt(this.label)}
        role=${jt(this.toggleable?"switch":void 0)}
        aria-checked=${jt(this.toggleable?t:void 0)}
        class=${Et({checked:this.toggleable&&this.checked})}
        @click=${this._handleButtonClick}
      >
        ${this.icon?L`<vscode-icon name=${this.icon}></vscode-icon>`:q}
        <slot
          @slotchange=${this._handleSlotChange}
          class=${Et({empty:this._isSlotEmpty,textOnly:!this.icon})}
        ></slot>
      </button>
    `}};si.styles=ti,ei([dt({reflect:!0})],si.prototype,"icon",void 0),ei([dt()],si.prototype,"label",void 0),ei([dt({type:Boolean,reflect:!0})],si.prototype,"toggleable",void 0),ei([dt({type:Boolean,reflect:!0})],si.prototype,"checked",void 0),ei([ut()],si.prototype,"_isSlotEmpty",void 0),ei([function(t){return(e,s)=>{const{slot:i}={},o="slot"+(i?`[name=${i}]`:":not([name])");return vt(0,0,{get(){const e=this.renderRoot?.querySelector(o);return e?.assignedNodes(t)??[]}})}}()],si.prototype,"_assignedNodes",void 0),si=ei([yt("vscode-toolbar-button")],si);const ii=[wt,n`
    :host {
      gap: 4px;
      display: flex;
      align-items: center;
    }
  `];var oi=function(t,e,s,i){for(var o,r=arguments.length,n=r<3?e:null===i?i=Object.getOwnPropertyDescriptor(e,s):i,a=t.length-1;a>=0;a--)(o=t[a])&&(n=(r<3?o(n):r>3?o(e,s,n):o(e,s))||n);return r>3&&n&&Object.defineProperty(e,s,n),n};let ri=class extends xt{render(){return L` <slot></slot> `}};ri.styles=ii,ri=oi([yt("vscode-toolbar-container")],ri);const ni=[wt,n`
    :host {
      --hover-outline-color: transparent;
      --hover-outline-style: solid;
      --hover-outline-width: 0;
      --selected-outline-color: transparent;
      --selected-outline-style: solid;
      --selected-outline-width: 0;

      display: block;
      outline: none;
      user-select: none;
    }

    .wrapper {
      height: 100%;
    }

    li {
      list-style: none;
    }

    ul,
    li {
      margin: 0;
      padding: 0;
    }

    ul {
      position: relative;
    }

    :host([indent-guides]) ul ul:before {
      content: '';
      display: block;
      height: 100%;
      position: absolute;
      bottom: 0;
      left: var(--indent-guide-pos);
      top: 0;
      pointer-events: none;
      width: 1px;
      z-index: 1;
    }

    .contents {
      align-items: center;
      display: flex;
      font-family: var(--vscode-font-family);
      font-size: var(--vscode-font-size);
      font-weight: var(--vscode-font-weight);
      outline-offset: -1px;
      padding-right: 12px;
    }

    .multi .contents {
      align-items: flex-start;
    }

    .contents:hover {
      cursor: pointer;
    }

    .arrow-container {
      align-items: center;
      display: flex;
      height: 22px;
      justify-content: center;
      padding-left: 8px;
      padding-right: 6px;
      width: 16px;
    }

    .icon-arrow {
      color: currentColor;
      display: block;
    }

    .theme-icon {
      display: block;
      flex-shrink: 0;
      margin-right: 6px;
    }

    .image-icon {
      background-repeat: no-repeat;
      background-position: 0 center;
      background-size: 16px;
      display: block;
      flex-shrink: 0;
      margin-right: 6px;
      height: 22px;
      width: 16px;
    }

    .multi .contents .theme-icon {
      margin-top: 3px;
    }

    .text-content {
      display: flex;
      line-height: 22px;
    }

    .single .text-content {
      display: block;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      width: 100%;
    }

    .description {
      font-size: 0.9em;
      line-height: 22px;
      margin-left: 0.5em;
      opacity: 0.95;
      white-space: pre;
    }

    .actions {
      display: none;
    }

    .contents.selected > .actions,
    .contents.focused > .actions,
    .contents:hover > .actions {
      display: flex;
    }

    .decorations {
      align-items: center;
      display: flex;
      height: 22px;
      margin-left: 5px;
    }

    .filled-circle {
      margin-right: 3px;
      opacity: 0.4;
    }

    .decoration-text {
      font-size: 90%;
      font-weight: 600;
      margin-right: 3px;
      opacity: 0.75;
    }

    .filled-circle,
    .decoration-text {
      color: var(--color, currentColor);
    }

    .contents:hover .filled-circle,
    .contents:hover .decoration-text {
      color: var(--hover-color, var(--color));
    }

    .contents.focused .filled-circle,
    .contents.focused .decoration-text {
      color: var(--focused-color, var(--color));
    }

    .contents.selected .filled-circle,
    .contents.selected .decoration-text {
      color: var(--selected-color, var(--color));
    }

    /* Theme colors */
    :host(:focus) .wrapper.has-not-focused-item {
      outline: 1px solid var(--vscode-focusBorder);
    }

    :host(:focus) .contents.selected,
    :host(:focus) .contents.focused.selected {
      color: var(--vscode-list-activeSelectionForeground);
      background-color: var(--vscode-list-activeSelectionBackground);
    }

    :host(:focus) .contents.selected .icon-arrow,
    :host(:focus) .contents.selected.focused .icon-arrow,
    :host(:focus) .contents.selected .theme-icon,
    :host(:focus) .contents.selected.focused .theme-icon,
    :host(:focus) .contents.selected .action-icon,
    :host(:focus) .contents.selected.focused .action-icon {
      color: var(--vscode-list-activeSelectionIconForeground);
    }

    :host(:focus) .contents.focused {
      color: var(--vscode-list-focusForeground);
      background-color: var(--vscode-list-focusBackground);
    }

    :host(:focus) .contents.selected.focused {
      outline-color: var(
        --vscode-list-focusAndSelectionOutline,
        var(--vscode-list-focusOutline)
      );
    }

    .contents:hover {
      background-color: var(--vscode-list-hoverBackground);
      color: var(--vscode-list-hoverForeground);
    }

    .contents:hover,
    .contents.selected:hover {
      outline-color: var(--hover-outline-color);
      outline-style: var(--hover-outline-style);
      outline-width: var(--hover-outline-width);
    }

    .contents.selected,
    .contents.selected.focused {
      background-color: var(--vscode-list-inactiveSelectionBackground);
      color: var(--vscode-list-inactiveSelectionForeground);
    }

    .contents.selected,
    .contents.selected.focused {
      outline-color: var(--selected-outline-color);
      outline-style: var(--selected-outline-style);
      outline-width: var(--selected-outline-width);
    }

    .contents.selected .theme-icon {
      color: var(--vscode-list-inactiveSelectionIconForeground);
    }

    .contents.focused {
      background-color: var(--vscode-list-inactiveFocusBackground);
      outline: 1px dotted var(--vscode-list-inactiveFocusOutline);
    }

    :host(:focus) .contents.focused {
      outline: 1px solid var(--vscode-list-focusOutline);
    }

    :host([indent-guides]) ul ul:before {
      background-color: var(--vscode-tree-inactiveIndentGuidesStroke);
    }

    :host([indent-guides]) ul ul.has-active-item:before {
      background-color: var(--vscode-tree-indentGuidesStroke);
    }
  `];var ai=function(t,e,s,i){for(var o,r=arguments.length,n=r<3?e:null===i?i=Object.getOwnPropertyDescriptor(e,s):i,a=t.length-1;a>=0;a--)(o=t[a])&&(n=(r<3?o(n):r>3?o(e,s,n):o(e,s))||n);return r>3&&n&&Object.defineProperty(e,s,n),n};const ci=(t,e=[])=>{const s=[];return t.forEach(((t,i)=>{const o=[...e,i],r={...t,path:o};t.subItems&&(r.subItems=ci(t.subItems,o)),s.push(r)})),s},li=t=>!!(t.subItems&&Array.isArray(t.subItems)&&t?.subItems?.length>0);let hi=class extends xt{constructor(){super(...arguments),this.indent=8,this.arrows=!1,this.multiline=!1,this.tabindex=0,this.indentGuides=!1,this._data=[],this._selectedItem=null,this._focusedItem=null,this._selectedBranch=null,this._focusedBranch=null,this._handleComponentKeyDownBound=this._handleComponentKeyDown.bind(this)}set data(t){const e=this._data;this._data=ci(t),this.requestUpdate("data",e)}get data(){return this._data}closeAll(){this._closeSubTreeRecursively(this.data),this.requestUpdate()}deselectAll(){this._deselectItemsRecursively(this.data),this.requestUpdate()}getItemByPath(t){return this._getItemByPath(t)}connectedCallback(){super.connectedCallback(),this.addEventListener("keydown",this._handleComponentKeyDownBound)}disconnectedCallback(){super.disconnectedCallback(),this.removeEventListener("keydown",this._handleComponentKeyDownBound)}_getItemByPath(t){let e=this._data,s=null;return t.forEach(((i,o)=>{o===t.length-1?s=e[i]:e=e[i].subItems})),s}_handleActionClick(t){t.stopPropagation();const e=t.target,s=e.dataset.itemPath,i=e.dataset.index;let o=null,r="",n="";if(s){const t=s.split("/").map((t=>Number(t)));if(o=this._getItemByPath(t),o?.actions){const t=Number(i);o.actions[t]&&(r=o.actions[t].actionId)}o?.value&&(n=o.value)}this.dispatchEvent(new CustomEvent("vsc-run-action",{detail:{actionId:r,item:o,value:n}})),this.dispatchEvent(new CustomEvent("vsc-tree-action",{detail:{actionId:r,item:o,value:n}}))}_renderIconVariant(t){const{type:e,value:s}=t;return"themeicon"===e?L`<vscode-icon name=${s} class="theme-icon"></vscode-icon>`:L`<span
        class="image-icon"
        .style=${It({backgroundImage:`url(${s})`})}
      ></span>`}_renderIcon(t){const e={branch:{value:"folder",type:"themeicon"},open:{value:"folder-opened",type:"themeicon"},leaf:{value:"file",type:"themeicon"}};if(t.iconUrls)t.iconUrls.branch&&(e.branch={value:t.iconUrls.branch,type:"image"}),t.iconUrls.leaf&&(e.leaf={value:t.iconUrls.leaf,type:"image"}),t.iconUrls.open&&(e.open={value:t.iconUrls.open,type:"image"});else if("object"==typeof t.icons)t.icons.branch&&(e.branch={value:t.icons.branch,type:"themeicon"}),t.icons.leaf&&(e.leaf={value:t.icons.leaf,type:"themeicon"}),t.icons.open&&(e.open={value:t.icons.open,type:"themeicon"});else if(!t.icons)return L`${q}`;return li(t)?t.open?this._renderIconVariant(e.open):this._renderIconVariant(e.branch):this._renderIconVariant(e.leaf)}_renderArrow(t){if(!this.arrows||!li(t))return L`${q}`;const{open:e=!1}=t;return L`
      <div class="arrow-container">
        <vscode-icon name=${e?"chevron-down":"chevron-right"} class="icon-arrow"></vscode-icon>
      </div>
    `}_renderActions(t){const e=[];return t.actions&&Array.isArray(t.actions)&&t.actions.forEach(((s,i)=>{if(s.icon){const o=L`<vscode-icon
            name=${s.icon}
            action-icon
            title=${jt(s.tooltip)}
            data-item-path=${jt(t.path?.join("/"))}
            data-index=${i}
            class="action-icon"
            @click=${this._handleActionClick}
          ></vscode-icon>`;e.push(o)}})),e.length>0?L`<div class="actions">${e}</div>`:L`${q}`}_renderDecorations(t){const e=[];return t.decorations&&Array.isArray(t.decorations)&&t.decorations.forEach((t=>{const{appearance:s="text",visibleWhen:i="always",content:o="",color:r="",focusedColor:n="",hoverColor:a="",selectedColor:c=""}=t,l=`visible-when-${i}`,h={};switch(r&&(h["--color"]=r),n&&(h["--focused-color"]=n),a&&(h["--hover-color"]=a),c&&(h["--selected-color"]=c),s){case"counter-badge":e.push(L`<vscode-badge
                variant="counter"
                class=${["counter-badge",l].join(" ")}
                part="counter-badge-decoration"
                >${o}</vscode-badge
              >`);break;case"filled-circle":e.push(L`<vscode-icon
                name="circle-filled"
                size="14"
                class=${["filled-circle",l].join(" ")}
                part="filled-circle-decoration"
                .style=${It(h)}
              ></vscode-icon>`);break;case"text":e.push(L`<div
                class=${["decoration-text",l].join(" ")}
                part="caption-decoration"
                .style=${It(h)}
              >
                ${o}
              </div>`)}})),e.length>0?L`<div class="decorations" part="decorations">
        ${e}
      </div>`:L`${q}`}_renderTreeItem(t,e){const{open:s=!1,label:i,description:o="",tooltip:r,selected:n=!1,focused:a=!1,subItems:c=[]}=t,{path:l,itemType:h,hasFocusedItem:d=!1,hasSelectedItem:u=!1}=e,v=["contents"],p=s?["open"]:[],b=(l.length-1)*this.indent,f=this.arrows&&"leaf"===h?30+b:b,g=this._renderArrow(t),m=this._renderIcon(t),x=this.arrows?b+16:b+3,y=s&&"branch"===h?L`<ul
            .style=${It({"--indent-guide-pos":`${x}px`})}
            class=${Et({"has-active-item":d||u})}
          >
            ${this._renderTree(c,l)}
          </ul>`:q,w=o?L`<span class="description" part="description">${o}</span>`:q,k=this._renderActions(t),$=this._renderDecorations(t);return p.push(h),n&&v.push("selected"),a&&v.push("focused"),L`
      <li data-path=${l.join("/")} class=${p.join(" ")}>
        <div
          class=${v.join(" ")}
          .style=${It({paddingLeft:`${f+3}px`})}
        >
          ${g}${m}<span
            class="text-content"
            part="text-content"
            title=${jt(r)}
            >${i}${w}</span
          >
          ${k} ${$}
        </div>
        ${y}
      </li>
    `}_renderTree(t,e=[]){const s=[];return t?(t.forEach(((t,i)=>{const o=[...e,i],r=li(t)?"branch":"leaf",{selected:n=!1,focused:a=!1,hasFocusedItem:c=!1,hasSelectedItem:l=!1}=t;n&&(this._selectedItem=t),a&&(this._focusedItem=t),s.push(this._renderTreeItem(t,{path:o,itemType:r,hasFocusedItem:c,hasSelectedItem:l}))})),s):q}_selectItem(t){this._selectedItem&&(this._selectedItem.selected=!1),this._focusedItem&&(this._focusedItem.focused=!1),this._selectedItem=t,t.selected=!0,this._focusedItem=t,t.focused=!0,this._selectedBranch&&(this._selectedBranch.hasSelectedItem=!1);let e=null;if(t.path?.length&&t.path.length>1&&(e=this._getItemByPath(t.path.slice(0,-1))),li(t))this._selectedBranch=t,t.hasSelectedItem=!0,t.open=!t.open,t.open?(this._selectedBranch=t,t.hasSelectedItem=!0):e&&(this._selectedBranch=e,e.hasSelectedItem=!0);else if(t.path?.length&&t.path.length>1){const e=this._getItemByPath(t.path.slice(0,-1));e&&(this._selectedBranch=e,e.hasSelectedItem=!0)}else this._selectedBranch=t,t.hasSelectedItem=!0;this._emitSelectEvent(this._selectedItem,this._selectedItem.path.join("/")),this.requestUpdate()}_focusItem(t){this._focusedItem&&(this._focusedItem.focused=!1),this._focusedItem=t,t.focused=!0;const e=!!t?.subItems?.length;this._focusedBranch&&(this._focusedBranch.hasFocusedItem=!1);let s=null;t.path?.length&&t.path.length>1&&(s=this._getItemByPath(t.path.slice(0,-1))),e?t.open?(this._focusedBranch=t,t.hasFocusedItem=!0):!t.open&&s&&(this._focusedBranch=s,s.hasFocusedItem=!0):s&&(this._focusedBranch=s,s.hasFocusedItem=!0)}_closeSubTreeRecursively(t){t.forEach((t=>{t.open=!1,t.subItems&&t.subItems.length>0&&this._closeSubTreeRecursively(t.subItems)}))}_deselectItemsRecursively(t){t.forEach((t=>{t.selected&&(t.selected=!1),t.subItems&&t.subItems.length>0&&this._deselectItemsRecursively(t.subItems)}))}_emitSelectEvent(t,e){const{icons:s,label:i,open:o,value:r}=t,n={icons:s,itemType:li(t)?"branch":"leaf",label:i,open:o||!1,value:r||i,path:e};this.dispatchEvent(new CustomEvent("vsc-select",{bubbles:!0,composed:!0,detail:n})),this.dispatchEvent(new CustomEvent("vsc-tree-select",{detail:n}))}_focusPrevItem(){if(!this._focusedItem)return void this._focusItem(this._data[0]);const{path:t}=this._focusedItem;if(t&&t?.length>0){const e=t[t.length-1],s=t.length>1;if(e>0){const s=[...t];s[s.length-1]=e-1;const i=this._getItemByPath(s);let o=i;if(i?.open&&i.subItems?.length){const{subItems:t}=i;o=t[t.length-1]}this._focusItem(o)}else if(s){const e=[...t];e.pop(),this._focusItem(this._getItemByPath(e))}}else this._focusItem(this._data[0])}_focusNextItem(){if(!this._focusedItem)return void this._focusItem(this._data[0]);const{path:t,open:e}=this._focusedItem;if(e&&Array.isArray(this._focusedItem.subItems)&&this._focusedItem.subItems.length>0)return void this._focusItem(this._focusedItem.subItems[0]);const s=[...t];s[s.length-1]+=1;let i=this._getItemByPath(s);i?this._focusItem(i):(s.pop(),s.length>0&&(s[s.length-1]+=1,i=this._getItemByPath(s),i&&this._focusItem(i)))}_handleClick(t){const e=t.composedPath().find((t=>t.tagName&&"LI"===t.tagName.toUpperCase()));if(e){const t=(e.dataset.path||"").split("/").map((t=>Number(t))),s=this._getItemByPath(t);this._selectItem(s)}else this._focusedItem&&(this._focusedItem.focused=!1),this._focusedItem=null}_handleComponentKeyDown(t){const e=t.key;[" ","ArrowDown","ArrowUp","Enter","Escape"].includes(t.key)&&(t.stopPropagation(),t.preventDefault()),"Escape"===e&&(this._focusedItem=null),"ArrowUp"===e&&this._focusPrevItem(),"ArrowDown"===e&&this._focusNextItem(),"Enter"!==e&&" "!==e||this._focusedItem&&this._selectItem(this._focusedItem)}render(){const t=Et({multi:this.multiline,single:!this.multiline,wrapper:!0,"has-not-focused-item":!this._focusedItem,"selection-none":!this._selectedItem,"selection-single":null!==this._selectedItem});return L`
      <div @click=${this._handleClick} class=${t}>
        <ul>
          ${this._renderTree(this._data)}
        </ul>
      </div>
    `}};hi.styles=ni,ai([dt({type:Array,reflect:!1})],hi.prototype,"data",null),ai([dt({type:Number})],hi.prototype,"indent",void 0),ai([dt({type:Boolean,reflect:!0})],hi.prototype,"arrows",void 0),ai([dt({type:Boolean,reflect:!0})],hi.prototype,"multiline",void 0),ai([dt({type:Number,reflect:!0})],hi.prototype,"tabindex",void 0),ai([dt({type:Boolean,reflect:!0,attribute:"indent-guides"})],hi.prototype,"indentGuides",void 0),ai([ut()],hi.prototype,"_selectedItem",void 0),ai([ut()],hi.prototype,"_focusedItem",void 0),ai([ut()],hi.prototype,"_selectedBranch",void 0),ai([ut()],hi.prototype,"_focusedBranch",void 0),hi=ai([yt("vscode-tree")],hi);export{Ct as VscodeBadge,Rt as VscodeButton,Ut as VscodeButtonGroup,Xt as VscodeCheckbox,te as VscodeCheckboxGroup,ie as VscodeCollapsible,le as VscodeContextMenu,ne as VscodeContextMenuItem,ue as VscodeDivider,me as VscodeFormContainer,we as VscodeFormGroup,Ce as VscodeFormHelper,Nt as VscodeIcon,Re as VscodeLabel,as as VscodeMultiSelect,Xe as VscodeOption,hs as VscodeProgressRing,vs as VscodeRadio,Ae as VscodeRadioGroup,ms as VscodeScrollable,bs as VscodeSingleSelect,Cs as VscodeSplitLayout,zs as VscodeTabHeader,Es as VscodeTabPanel,Ys as VscodeTable,Ms as VscodeTableBody,Ns as VscodeTableCell,Rs as VscodeTableHeader,Us as VscodeTableHeaderCell,Ks as VscodeTableRow,Qs as VscodeTabs,Ie as VscodeTextarea,Ne as VscodeTextfield,si as VscodeToolbarButton,ri as VscodeToolbarContainer,hi as VscodeTree};

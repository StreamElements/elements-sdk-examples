var g = Object.defineProperty;
var d = (a, e, t) => e in a ? g(a, e, { enumerable: !0, configurable: !0, writable: !0, value: t }) : a[e] = t;
var r = (a, e, t) => (d(a, typeof e != "symbol" ? e + "" : e, t), t);
var i = /* @__PURE__ */ ((a) => (a.fetchManagedData = "fetchManagedData", a.storeManagedData = "storeManagedData", a.fetchPersistentData = "fetchPersistentData", a.managedDataChanged = "managedDataChanged", a.persistentStorageVariableValueChanged = "persistentStorageVariableValueChanged", a.persistentStorageVariableValueBeforeChange = "persistentStorageVariableValueBeforeChange", a))(i || {});
function f() {
  return Math.random().toString(36).substring(2, 15);
}
class h {
  constructor() {
    r(this, "queTimeout", 2e3);
    r(this, "maxRetries", 30);
    r(this, "requestResponseQue", []);
    r(this, "events", /* @__PURE__ */ new Map());
    window.addEventListener("message", (e) => {
      const t = e.data;
      if (t.origin === "control-panel") {
        if (t.type === "callback") {
          if (t.name === "persistentStorageVariableValueChanged") {
            const s = this.events.get(
              "persistentStorageVariableValueBeforeChange"
              /* persistentStorageVariableValueBeforeChange */
            );
            s && s.forEach((o) => o(t.payload));
          }
          const n = this.events.get(t.name);
          n && n.forEach((s) => s(t.payload));
        }
        this.requestResponseQue.push(t);
      }
    });
  }
  trigger(e) {
    var t;
    (t = this.events.get(e.name)) == null || t.forEach((n) => n(e.payload));
  }
  emit(e) {
    window.parent.postMessage(e, "*");
  }
  on(e, t) {
    var n;
    this.events.has(e) || this.events.set(e, /* @__PURE__ */ new Set()), (n = this.events.get(e)) == null || n.add(t);
  }
  off(e, t) {
    const n = this.events.get(e);
    n && n.delete(t);
  }
}
class u {
  constructor(e) {
    this.controlPanelApiDispatcher = e;
  }
  async fetchManagedData() {
    return await this.controlPanelApiDispatcher.fetch({
      name: i.fetchManagedData,
      origin: "control-panel"
    });
  }
  async storeManagedData({ managedData: e }) {
    if (!e)
      throw new Error("managedData is required");
    return await this.controlPanelApiDispatcher.emit({
      type: "dispatch",
      name: i.storeManagedData,
      origin: "control-panel",
      payload: JSON.stringify(e)
    });
  }
  async fetchPersistentData() {
    return await this.controlPanelApiDispatcher.fetch({
      name: i.fetchPersistentData,
      origin: "control-panel"
    });
  }
}
class D extends h {
  fetch(e) {
    let t = 0;
    const n = f();
    return this.on(e.name, (s) => {
      this.requestResponseQue.push(s);
    }), new Promise((s, o) => {
      this.emit({
        ...e,
        type: "dispatch",
        transactionId: n,
        name: i.fetchManagedData
      });
      const c = setInterval(() => {
        t >= this.maxRetries && (clearInterval(c), o("No response in set time")), t++;
        const l = this.requestResponseQue.find(
          (p) => p.transactionId === n
        );
        l && (clearTimeout(c), s(l.payload));
      }, 500);
    });
  }
}
class P {
  constructor({ controlPanelDispatcher: e }) {
    r(this, "controlPanelDispatcher");
    this.controlPanelDispatcher = e;
  }
  on(e, t) {
    this.controlPanelDispatcher.on(e, t);
  }
  off(e, t) {
    this.controlPanelDispatcher.off(e, t);
  }
}
class w {
  constructor(e, t) {
    r(this, "persistentDataMap");
    this.controlPanelDispatcher = e, this.controlPanelApiDispatcher = t, this.persistentDataMap = /* @__PURE__ */ new Map(), this.controlPanelDispatcher.on(
      i.persistentStorageVariableValueBeforeChange,
      ({ key: n, value: s }) => {
        this.persistentDataMap.set(n, s);
      }
    ), this.controlPanelApiDispatcher.fetch({
      name: i.fetchManagedData,
      origin: "control-panel"
    }).then((n) => {
      Object.entries(n).forEach(([s, o]) => {
        this.persistentDataMap.has(s) || (this.persistentDataMap.set(s, o), this.controlPanelDispatcher.trigger({
          type: "dispatch",
          name: i.persistentStorageVariableValueChanged,
          origin: "control-panel",
          payload: {
            key: s,
            value: o,
            requestKey: i.fetchManagedData
          }
        }));
      });
    });
  }
  getValue({
    key: e
  }) {
    return this.persistentDataMap.get(e);
  }
}
class M {
  constructor() {
    r(this, "api");
    r(this, "events");
    r(this, "persistentStorage");
    const e = new h(), t = new D();
    this.api = new u(t), this.events = new P({ controlPanelDispatcher: e }), this.persistentStorage = new w(e, t);
  }
}
window.controlPanel = new M();
//# sourceMappingURL=sdk.js.map

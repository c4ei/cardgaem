// Should be no imports here!
var _a; // SOme things that should be evaluated before all else...


var hasSymbol = typeof Symbol !== "undefined";
var hasMap = typeof Map !== "undefined";
var hasSet = typeof Set !== "undefined";
/**
 * The sentinel value returned by producers to replace the draft with undefined.
 */

var NOTHING = hasSymbol ? Symbol("immer-nothing") : (_a = {}, _a["immer-nothing"] = true, _a);
/**
 * To let Immer treat your class instances as plain immutable objects
 * (albeit with a custom prototype), you must define either an instance property
 * or a static property on each of your custom classes.
 *
 * Otherwise, your class instance will never be drafted, which means it won't be
 * safe to mutate in a produce callback.
 */

var DRAFTABLE = hasSymbol ? Symbol("immer-draftable") : "__$immer_draftable";
var DRAFT_STATE = hasSymbol ? Symbol("immer-state") : "__$immer_state";
var iteratorSymbol = hasSymbol ? Symbol.iterator : "@@iterator";

/* istanbul ignore next */
var extendStatics = function (d, b) {
  extendStatics = Object.setPrototypeOf || {
    __proto__: []
  } instanceof Array && function (d, b) {
    d.__proto__ = b;
  } || function (d, b) {
    for (var p in b) { if (b.hasOwnProperty(p)) { d[p] = b[p]; } }
  };

  return extendStatics(d, b);
}; // Ugly hack to resolve #502 and inherit built in Map / Set


function __extends(d, b) {
  extendStatics(d, b);

  function __() {
    this.constructor = d;
  }

  d.prototype = ( // @ts-ignore
  __.prototype = b.prototype, new __());
}

var Archtype;

(function (Archtype) {
  Archtype[Archtype["Object"] = 0] = "Object";
  Archtype[Archtype["Array"] = 1] = "Array";
  Archtype[Archtype["Map"] = 2] = "Map";
  Archtype[Archtype["Set"] = 3] = "Set";
})(Archtype || (Archtype = {}));

var ProxyType;

(function (ProxyType) {
  ProxyType[ProxyType["ProxyObject"] = 0] = "ProxyObject";
  ProxyType[ProxyType["ProxyArray"] = 1] = "ProxyArray";
  ProxyType[ProxyType["ES5Object"] = 2] = "ES5Object";
  ProxyType[ProxyType["ES5Array"] = 3] = "ES5Array";
  ProxyType[ProxyType["Map"] = 4] = "Map";
  ProxyType[ProxyType["Set"] = 5] = "Set";
})(ProxyType || (ProxyType = {}));

/** Returns true if the given value is an Immer draft */

function isDraft(value) {
  return !!value && !!value[DRAFT_STATE];
}
/** Returns true if the given value can be drafted by Immer */

function isDraftable(value) {
  if (!value) { return false; }
  return isPlainObject(value) || Array.isArray(value) || !!value[DRAFTABLE] || !!value.constructor[DRAFTABLE] || isMap(value) || isSet(value);
}
function isPlainObject(value) {
  if (!value || typeof value !== "object") { return false; }
  var proto = Object.getPrototypeOf(value);
  return !proto || proto === Object.prototype;
}
function original(value) {
  if (value && value[DRAFT_STATE]) {
    return value[DRAFT_STATE].base;
  } // otherwise return undefined

}
var ownKeys = typeof Reflect !== "undefined" && Reflect.ownKeys ? Reflect.ownKeys : typeof Object.getOwnPropertySymbols !== "undefined" ? function (obj) {
  return Object.getOwnPropertyNames(obj).concat(Object.getOwnPropertySymbols(obj));
} :
/* istanbul ignore next */
Object.getOwnPropertyNames;
function each(obj, iter) {
  if (getArchtype(obj) === Archtype.Object) {
    ownKeys(obj).forEach(function (key) {
      return iter(key, obj[key], obj);
    });
  } else {
    obj.forEach(function (entry, index) {
      return iter(index, entry, obj);
    });
  }
}
function isEnumerable(base, prop) {
  var desc = Object.getOwnPropertyDescriptor(base, prop);
  return desc && desc.enumerable ? true : false;
}
function getArchtype(thing) {
  /* istanbul ignore next */
  if (!thing) { die(); }

  if (thing[DRAFT_STATE]) {
    switch (thing[DRAFT_STATE].type) {
      case ProxyType.ES5Object:
      case ProxyType.ProxyObject:
        return Archtype.Object;

      case ProxyType.ES5Array:
      case ProxyType.ProxyArray:
        return Archtype.Array;

      case ProxyType.Map:
        return Archtype.Map;

      case ProxyType.Set:
        return Archtype.Set;
    }
  }

  return Array.isArray(thing) ? Archtype.Array : isMap(thing) ? Archtype.Map : isSet(thing) ? Archtype.Set : Archtype.Object;
}
function has(thing, prop) {
  return getArchtype(thing) === Archtype.Map ? thing.has(prop) : Object.prototype.hasOwnProperty.call(thing, prop);
}
function get(thing, prop) {
  // @ts-ignore
  return getArchtype(thing) === Archtype.Map ? thing.get(prop) : thing[prop];
}
function set(thing, propOrOldValue, value) {
  switch (getArchtype(thing)) {
    case Archtype.Map:
      thing.set(propOrOldValue, value);
      break;

    case Archtype.Set:
      thing.delete(propOrOldValue);
      thing.add(value);
      break;

    default:
      thing[propOrOldValue] = value;
  }
}
function is(x, y) {
  // From: https://github.com/facebook/fbjs/blob/c69904a511b900266935168223063dd8772dfc40/packages/fbjs/src/core/shallowEqual.js
  if (x === y) {
    return x !== 0 || 1 / x === 1 / y;
  } else {
    return x !== x && y !== y;
  }
}
function isMap(target) {
  return hasMap && target instanceof Map;
}
function isSet(target) {
  return hasSet && target instanceof Set;
}
function latest(state) {
  return state.copy || state.base;
}
function shallowCopy(base, invokeGetters) {
  if (invokeGetters === void 0) {
    invokeGetters = false;
  }

  if (Array.isArray(base)) { return base.slice(); }
  var clone = Object.create(Object.getPrototypeOf(base));
  ownKeys(base).forEach(function (key) {
    if (key === DRAFT_STATE) {
      return; // Never copy over draft state.
    }

    var desc = Object.getOwnPropertyDescriptor(base, key);
    var value = desc.value;

    if (desc.get) {
      if (!invokeGetters) {
        throw new Error("Immer drafts cannot have computed properties");
      }

      value = desc.get.call(base);
    }

    if (desc.enumerable) {
      clone[key] = value;
    } else {
      Object.defineProperty(clone, key, {
        value: value,
        writable: true,
        configurable: true
      });
    }
  });
  return clone;
}
function freeze(obj, deep) {
  if (!isDraftable(obj) || isDraft(obj) || Object.isFrozen(obj)) { return; }
  var type = getArchtype(obj);

  if (type === Archtype.Set) {
    obj.add = obj.clear = obj.delete = dontMutateFrozenCollections;
  } else if (type === Archtype.Map) {
    obj.set = obj.clear = obj.delete = dontMutateFrozenCollections;
  }

  Object.freeze(obj);
  if (deep) { each(obj, function (_, value) {
    return freeze(value, true);
  }); }
}

function dontMutateFrozenCollections() {
  throw new Error("This object has been frozen and should not be mutated");
}

function createHiddenProperty(target, prop, value) {
  Object.defineProperty(target, prop, {
    value: value,
    enumerable: false,
    writable: true
  });
}
/* istanbul ignore next */

function die() {
  throw new Error("Illegal state, please file a bug");
}

/** Each scope represents a `produce` call. */

var ImmerScope =
/** @class */
function () {
  function ImmerScope(parent, immer) {
    this.drafts = [];
    this.parent = parent;
    this.immer = immer; // Whenever the modified draft contains a draft from another scope, we
    // need to prevent auto-freezing so the unowned draft can be finalized.

    this.canAutoFreeze = true;
  }

  ImmerScope.prototype.usePatches = function (patchListener) {
    if (patchListener) {
      this.patches = [];
      this.inversePatches = [];
      this.patchListener = patchListener;
    }
  };

  ImmerScope.prototype.revoke = function () {
    this.leave();
    this.drafts.forEach(revoke); // @ts-ignore

    this.drafts = null;
  };

  ImmerScope.prototype.leave = function () {
    if (this === ImmerScope.current) {
      ImmerScope.current = this.parent;
    }
  };

  ImmerScope.enter = function (immer) {
    var scope = new ImmerScope(ImmerScope.current, immer);
    ImmerScope.current = scope;
    return scope;
  };

  return ImmerScope;
}();

function revoke(draft) {
  var state = draft[DRAFT_STATE];
  if (state.type === ProxyType.ProxyObject || state.type === ProxyType.ProxyArray) { state.revoke(); }else { state.revoked = true; }
}

function processResult(immer, result, scope) {
  var baseDraft = scope.drafts[0];
  var isReplaced = result !== undefined && result !== baseDraft;
  immer.willFinalize(scope, result, isReplaced);

  if (isReplaced) {
    if (baseDraft[DRAFT_STATE].modified) {
      scope.revoke();
      throw new Error("An immer producer returned a new value *and* modified its draft. Either return a new value *or* modify the draft."); // prettier-ignore
    }

    if (isDraftable(result)) {
      // Finalize the result in case it contains (or is) a subset of the draft.
      result = finalize(immer, result, scope);
      maybeFreeze(immer, result);
    }

    if (scope.patches) {
      scope.patches.push({
        op: "replace",
        path: [],
        value: result
      });
      scope.inversePatches.push({
        op: "replace",
        path: [],
        value: baseDraft[DRAFT_STATE].base
      });
    }
  } else {
    // Finalize the base draft.
    result = finalize(immer, baseDraft, scope, []);
  }

  scope.revoke();

  if (scope.patches) {
    scope.patchListener(scope.patches, scope.inversePatches);
  }

  return result !== NOTHING ? result : undefined;
}

function finalize(immer, draft, scope, path) {
  var state = draft[DRAFT_STATE];

  if (!state) {
    if (Object.isFrozen(draft)) { return draft; }
    return finalizeTree(immer, draft, scope);
  } // Never finalize drafts owned by another scope.


  if (state.scope !== scope) {
    return draft;
  }

  if (!state.modified) {
    maybeFreeze(immer, state.base, true);
    return state.base;
  }

  if (!state.finalized) {
    state.finalized = true;
    finalizeTree(immer, state.draft, scope, path); // We cannot really delete anything inside of a Set. We can only replace the whole Set.

    if (immer.onDelete && state.type !== ProxyType.Set) {
      // The `assigned` object is unreliable with ES5 drafts.
      if (immer.useProxies) {
        var assigned = state.assigned;
        each(assigned, function (prop, exists) {
          if (!exists) { immer.onDelete(state, prop); }
        });
      } else {
        var base = state.base,
            copy_1 = state.copy;
        each(base, function (prop) {
          if (!has(copy_1, prop)) { immer.onDelete(state, prop); }
        });
      }
    }

    if (immer.onCopy) {
      immer.onCopy(state);
    } // At this point, all descendants of `state.copy` have been finalized,
    // so we can be sure that `scope.canAutoFreeze` is accurate.


    if (immer.autoFreeze && scope.canAutoFreeze) {
      freeze(state.copy, false);
    }

    if (path && scope.patches) {
      generatePatches(state, path, scope.patches, scope.inversePatches);
    }
  }

  return state.copy;
}

function finalizeTree(immer, root, scope, rootPath) {
  var state = root[DRAFT_STATE];

  if (state) {
    if (state.type === ProxyType.ES5Object || state.type === ProxyType.ES5Array) {
      // Create the final copy, with added keys and without deleted keys.
      state.copy = shallowCopy(state.draft, true);
    }

    root = state.copy;
  }

  each(root, function (key, value) {
    return finalizeProperty(immer, scope, root, state, root, key, value, rootPath);
  });
  return root;
}

function finalizeProperty(immer, scope, root, rootState, parentValue, prop, childValue, rootPath) {
  if (childValue === parentValue) {
    throw Error("Immer forbids circular references");
  } // In the `finalizeTree` method, only the `root` object may be a draft.


  var isDraftProp = !!rootState && parentValue === root;
  var isSetMember = isSet(parentValue);

  if (isDraft(childValue)) {
    var path = rootPath && isDraftProp && !isSetMember && // Set objects are atomic since they have no keys.
    !has(rootState.assigned, prop) // Skip deep patches for assigned keys.
    ? rootPath.concat(prop) : undefined; // Drafts owned by `scope` are finalized here.

    childValue = finalize(immer, childValue, scope, path);
    set(parentValue, prop, childValue); // Drafts from another scope must prevent auto-freezing.

    if (isDraft(childValue)) {
      scope.canAutoFreeze = false;
    }
  } // Unchanged draft properties are ignored.
  else if (isDraftProp && is(childValue, get(rootState.base, prop))) {
      return;
    } // Search new objects for unfinalized drafts. Frozen objects should never contain drafts.
    // TODO: the recursion over here looks weird, shouldn't non-draft stuff have it's own recursion?
    // especially the passing on of root and rootState doesn't make sense...
    else if (isDraftable(childValue) && !Object.isFrozen(childValue)) {
        each(childValue, function (key, grandChild) {
          return finalizeProperty(immer, scope, root, rootState, childValue, key, grandChild, rootPath);
        });
        maybeFreeze(immer, childValue);
      }

  if (isDraftProp && immer.onAssign && !isSetMember) {
    immer.onAssign(rootState, prop, childValue);
  }
}

function maybeFreeze(immer, value, deep) {
  if (deep === void 0) {
    deep = false;
  }

  if (immer.autoFreeze && !isDraft(value)) {
    freeze(value, deep);
  }
}

/**
 * Returns a new draft of the `base` object.
 *
 * The second argument is the parent draft-state (used internally).
 */

function createProxy(base, parent) {
  var isArray = Array.isArray(base);
  var state = {
    type: isArray ? ProxyType.ProxyArray : ProxyType.ProxyObject,
    // Track which produce call this is associated with.
    scope: parent ? parent.scope : ImmerScope.current,
    // True for both shallow and deep changes.
    modified: false,
    // Used during finalization.
    finalized: false,
    // Track which properties have been assigned (true) or deleted (false).
    assigned: {},
    // The parent draft state.
    parent: parent,
    // The base state.
    base: base,
    // The base proxy.
    draft: null,
    // Any property proxies.
    drafts: {},
    // The base copy with any updated values.
    copy: null,
    // Called by the `produce` function.
    revoke: null,
    isManual: false
  }; // the traps must target something, a bit like the 'real' base.
  // but also, we need to be able to determine from the target what the relevant state is
  // (to avoid creating traps per instance to capture the state in closure,
  // and to avoid creating weird hidden properties as well)
  // So the trick is to use 'state' as the actual 'target'! (and make sure we intercept everything)
  // Note that in the case of an array, we put the state in an array to have better Reflect defaults ootb

  var target = state;
  var traps = objectTraps;

  if (isArray) {
    target = [state];
    traps = arrayTraps;
  } // TODO: optimization: might be faster, cheaper if we created a non-revocable proxy
  // and administrate revoking ourselves


  var _a = Proxy.revocable(target, traps),
      revoke = _a.revoke,
      proxy = _a.proxy;

  state.draft = proxy;
  state.revoke = revoke;
  return proxy;
}
/**
 * Object drafts
 */

var objectTraps = {
  get: function (state, prop) {
    if (prop === DRAFT_STATE) { return state; }
    var drafts = state.drafts; // Check for existing draft in unmodified state.

    if (!state.modified && has(drafts, prop)) {
      return drafts[prop];
    }

    var value = latest(state)[prop];

    if (state.finalized || !isDraftable(value)) {
      return value;
    } // Check for existing draft in modified state.


    if (state.modified) {
      // Assigned values are never drafted. This catches any drafts we created, too.
      if (value !== peek(state.base, prop)) { return value; } // Store drafts on the copy (when one exists).
      // @ts-ignore

      drafts = state.copy;
    }

    return drafts[prop] = state.scope.immer.createProxy(value, state);
  },
  has: function (state, prop) {
    return prop in latest(state);
  },
  ownKeys: function (state) {
    return Reflect.ownKeys(latest(state));
  },
  set: function (state, prop
  /* strictly not, but helps TS */
  , value) {
    if (!state.modified) {
      var baseValue = peek(state.base, prop); // Optimize based on value's truthiness. Truthy values are guaranteed to
      // never be undefined, so we can avoid the `in` operator. Lastly, truthy
      // values may be drafts, but falsy values are never drafts.

      var isUnchanged = value ? is(baseValue, value) || value === state.drafts[prop] : is(baseValue, value) && prop in state.base;
      if (isUnchanged) { return true; }
      prepareCopy(state);
      markChanged(state);
    }

    state.assigned[prop] = true; // @ts-ignore

    state.copy[prop] = value;
    return true;
  },
  deleteProperty: function (state, prop) {
    // The `undefined` check is a fast path for pre-existing keys.
    if (peek(state.base, prop) !== undefined || prop in state.base) {
      state.assigned[prop] = false;
      prepareCopy(state);
      markChanged(state);
    } else if (state.assigned[prop]) {
      // if an originally not assigned property was deleted
      delete state.assigned[prop];
    } // @ts-ignore


    if (state.copy) { delete state.copy[prop]; }
    return true;
  },
  // Note: We never coerce `desc.value` into an Immer draft, because we can't make
  // the same guarantee in ES5 mode.
  getOwnPropertyDescriptor: function (state, prop) {
    var owner = latest(state);
    var desc = Reflect.getOwnPropertyDescriptor(owner, prop);

    if (desc) {
      desc.writable = true;
      desc.configurable = state.type !== ProxyType.ProxyArray || prop !== "length";
    }

    return desc;
  },
  defineProperty: function () {
    throw new Error("Object.defineProperty() cannot be used on an Immer draft"); // prettier-ignore
  },
  getPrototypeOf: function (state) {
    return Object.getPrototypeOf(state.base);
  },
  setPrototypeOf: function () {
    throw new Error("Object.setPrototypeOf() cannot be used on an Immer draft"); // prettier-ignore
  }
};
/**
 * Array drafts
 */

var arrayTraps = {};
each(objectTraps, function (key, fn) {
  // @ts-ignore
  arrayTraps[key] = function () {
    arguments[0] = arguments[0][0];
    return fn.apply(this, arguments);
  };
});

arrayTraps.deleteProperty = function (state, prop) {
  if (isNaN(parseInt(prop))) {
    throw new Error("Immer only supports deleting array indices"); // prettier-ignore
  }

  return objectTraps.deleteProperty.call(this, state[0], prop);
};

arrayTraps.set = function (state, prop, value) {
  if (prop !== "length" && isNaN(parseInt(prop))) {
    throw new Error("Immer only supports setting array indices and the 'length' property"); // prettier-ignore
  }

  return objectTraps.set.call(this, state[0], prop, value, state[0]);
};
/**
 * Map drafts
 */
// Access a property without creating an Immer draft.


function peek(draft, prop) {
  var state = draft[DRAFT_STATE];
  var desc = Reflect.getOwnPropertyDescriptor(state ? latest(state) : draft, prop);
  return desc && desc.value;
}

function markChanged(state) {
  if (!state.modified) {
    state.modified = true;

    if (state.type === ProxyType.ProxyObject || state.type === ProxyType.ProxyArray) {
      var copy_1 = state.copy = shallowCopy(state.base);
      each(state.drafts, function (key, value) {
        // @ts-ignore
        copy_1[key] = value;
      });
      state.drafts = undefined;
    }

    if (state.parent) {
      markChanged(state.parent);
    }
  }
}

function prepareCopy(state) {
  if (!state.copy) {
    state.copy = shallowCopy(state.base);
  }
}

function willFinalizeES5(scope, result, isReplaced) {
  scope.drafts.forEach(function (draft) {
    draft[DRAFT_STATE].finalizing = true;
  });

  if (!isReplaced) {
    if (scope.patches) {
      markChangesRecursively(scope.drafts[0]);
    } // This is faster when we don't care about which attributes changed.


    markChangesSweep(scope.drafts);
  } // When a child draft is returned, look for changes.
  else if (isDraft(result) && result[DRAFT_STATE].scope === scope) {
      markChangesSweep(scope.drafts);
    }
}
function createES5Proxy(base, parent) {
  var isArray = Array.isArray(base);
  var draft = clonePotentialDraft(base);
  each(draft, function (prop) {
    proxyProperty(draft, prop, isArray || isEnumerable(base, prop));
  });
  var state = {
    type: isArray ? ProxyType.ES5Array : ProxyType.ES5Object,
    scope: parent ? parent.scope : ImmerScope.current,
    modified: false,
    finalizing: false,
    finalized: false,
    assigned: {},
    parent: parent,
    base: base,
    draft: draft,
    copy: null,
    revoked: false,
    isManual: false
  };
  createHiddenProperty(draft, DRAFT_STATE, state);
  return draft;
} // Access a property without creating an Immer draft.

function peek$1(draft, prop) {
  var state = draft[DRAFT_STATE];

  if (state && !state.finalizing) {
    state.finalizing = true;
    var value = draft[prop];
    state.finalizing = false;
    return value;
  }

  return draft[prop];
}

function get$1(state, prop) {
  assertUnrevoked(state);
  var value = peek$1(latest(state), prop);
  if (state.finalizing) { return value; } // Create a draft if the value is unmodified.

  if (value === peek$1(state.base, prop) && isDraftable(value)) {
    prepareCopy$1(state); // @ts-ignore

    return state.copy[prop] = state.scope.immer.createProxy(value, state);
  }

  return value;
}

function set$1(state, prop, value) {
  assertUnrevoked(state);
  state.assigned[prop] = true;

  if (!state.modified) {
    if (is(value, peek$1(latest(state), prop))) { return; }
    markChangedES5(state);
    prepareCopy$1(state);
  } // @ts-ignore


  state.copy[prop] = value;
}

function markChangedES5(state) {
  if (!state.modified) {
    state.modified = true;
    if (state.parent) { markChangedES5(state.parent); }
  }
}

function prepareCopy$1(state) {
  if (!state.copy) { state.copy = clonePotentialDraft(state.base); }
}

function clonePotentialDraft(base) {
  var state = base && base[DRAFT_STATE];

  if (state) {
    state.finalizing = true;
    var draft = shallowCopy(state.draft, true);
    state.finalizing = false;
    return draft;
  }

  return shallowCopy(base);
} // property descriptors are recycled to make sure we don't create a get and set closure per property,
// but share them all instead


var descriptors = {};

function proxyProperty(draft, prop, enumerable) {
  var desc = descriptors[prop];

  if (desc) {
    desc.enumerable = enumerable;
  } else {
    descriptors[prop] = desc = {
      configurable: true,
      enumerable: enumerable,
      get: function () {
        return get$1(this[DRAFT_STATE], prop);
      },
      set: function (value) {
        set$1(this[DRAFT_STATE], prop, value);
      }
    };
  }

  Object.defineProperty(draft, prop, desc);
}

function assertUnrevoked(state) {
  if (state.revoked === true) { throw new Error("Cannot use a proxy that has been revoked. Did you pass an object from inside an immer function to an async process? " + JSON.stringify(latest(state))); }
} // This looks expensive, but only proxies are visited, and only objects without known changes are scanned.

function markChangesSweep(drafts) {
  // The natural order of drafts in the `scope` array is based on when they
  // were accessed. By processing drafts in reverse natural order, we have a
  // better chance of processing leaf nodes first. When a leaf node is known to
  // have changed, we can avoid any traversal of its ancestor nodes.
  for (var i = drafts.length - 1; i >= 0; i--) {
    var state = drafts[i][DRAFT_STATE];

    if (!state.modified) {
      switch (state.type) {
        case ProxyType.ES5Array:
          if (hasArrayChanges(state)) { markChangedES5(state); }
          break;

        case ProxyType.ES5Object:
          if (hasObjectChanges(state)) { markChangedES5(state); }
          break;
      }
    }
  }
}

function markChangesRecursively(object) {
  if (!object || typeof object !== "object") { return; }
  var state = object[DRAFT_STATE];
  if (!state) { return; }
  var base = state.base,
      draft = state.draft,
      assigned = state.assigned,
      type = state.type;

  if (type === ProxyType.ES5Object) {
    // Look for added keys.
    // TODO: looks quite duplicate to hasObjectChanges,
    // probably there is a faster way to detect changes, as sweep + recurse seems to do some
    // unnecessary work.
    // also: probably we can store the information we detect here, to speed up tree finalization!
    each(draft, function (key) {
      if (key === DRAFT_STATE) { return; } // The `undefined` check is a fast path for pre-existing keys.

      if (base[key] === undefined && !has(base, key)) {
        assigned[key] = true;
        markChangedES5(state);
      } else if (!assigned[key]) {
        // Only untouched properties trigger recursion.
        markChangesRecursively(draft[key]);
      }
    }); // Look for removed keys.

    each(base, function (key) {
      // The `undefined` check is a fast path for pre-existing keys.
      if (draft[key] === undefined && !has(draft, key)) {
        assigned[key] = false;
        markChangedES5(state);
      }
    });
  } else if (type === ProxyType.ES5Array && hasArrayChanges(state)) {
    markChangedES5(state);
    assigned.length = true;

    if (draft.length < base.length) {
      for (var i = draft.length; i < base.length; i++) { assigned[i] = false; }
    } else {
      for (var i = base.length; i < draft.length; i++) { assigned[i] = true; }
    }

    for (var i = 0; i < draft.length; i++) {
      // Only untouched indices trigger recursion.
      if (assigned[i] === undefined) { markChangesRecursively(draft[i]); }
    }
  }
}

function hasObjectChanges(state) {
  var base = state.base,
      draft = state.draft; // Search for added keys and changed keys. Start at the back, because
  // non-numeric keys are ordered by time of definition on the object.

  var keys = Object.keys(draft);

  for (var i = keys.length - 1; i >= 0; i--) {
    var key = keys[i];
    var baseValue = base[key]; // The `undefined` check is a fast path for pre-existing keys.

    if (baseValue === undefined && !has(base, key)) {
      return true;
    } // Once a base key is deleted, future changes go undetected, because its
    // descriptor is erased. This branch detects any missed changes.
    else {
        var value = draft[key];
        var state_1 = value && value[DRAFT_STATE];

        if (state_1 ? state_1.base !== baseValue : !is(value, baseValue)) {
          return true;
        }
      }
  } // At this point, no keys were added or changed.
  // Compare key count to determine if keys were deleted.


  return keys.length !== Object.keys(base).length;
}

function hasArrayChanges(state) {
  var draft = state.draft;
  if (draft.length !== state.base.length) { return true; } // See #116
  // If we first shorten the length, our array interceptors will be removed.
  // If after that new items are added, result in the same original length,
  // those last items will have no intercepting property.
  // So if there is no own descriptor on the last position, we know that items were removed and added
  // N.B.: splice, unshift, etc only shift values around, but not prop descriptors, so we only have to check
  // the last one

  var descriptor = Object.getOwnPropertyDescriptor(draft, draft.length - 1); // descriptor can be null, but only for newly created sparse arrays, eg. new Array(10)

  if (descriptor && !descriptor.get) { return true; } // For all other cases, we don't have to compare, as they would have been picked up by the index setters

  return false;
}

var DraftMap = function (_super) {
  if (!_super) {
    /* istanbul ignore next */
    throw new Error("Map is not polyfilled");
  }

  __extends(DraftMap, _super); // Create class manually, cause #502


  function DraftMap(target, parent) {
    this[DRAFT_STATE] = {
      type: ProxyType.Map,
      parent: parent,
      scope: parent ? parent.scope : ImmerScope.current,
      modified: false,
      finalized: false,
      copy: undefined,
      assigned: undefined,
      base: target,
      draft: this,
      isManual: false,
      revoked: false
    };
    return this;
  }

  var p = DraftMap.prototype; // TODO: smaller build size if we create a util for Object.defineProperty

  Object.defineProperty(p, "size", {
    get: function () {
      return latest(this[DRAFT_STATE]).size;
    },
    enumerable: true,
    configurable: true
  });

  p.has = function (key) {
    return latest(this[DRAFT_STATE]).has(key);
  };

  p.set = function (key, value) {
    var state = this[DRAFT_STATE];
    assertUnrevoked(state);

    if (latest(state).get(key) !== value) {
      prepareCopy$2(state);
      state.scope.immer.markChanged(state);
      state.assigned.set(key, true);
      state.copy.set(key, value);
      state.assigned.set(key, true);
    }

    return this;
  };

  p.delete = function (key) {
    if (!this.has(key)) {
      return false;
    }

    var state = this[DRAFT_STATE];
    assertUnrevoked(state);
    prepareCopy$2(state);
    state.scope.immer.markChanged(state);
    state.assigned.set(key, false);
    state.copy.delete(key);
    return true;
  };

  p.clear = function () {
    var state = this[DRAFT_STATE];
    assertUnrevoked(state);
    prepareCopy$2(state);
    state.scope.immer.markChanged(state);
    state.assigned = new Map();
    return state.copy.clear();
  };

  p.forEach = function (cb, thisArg) {
    var _this = this;

    var state = this[DRAFT_STATE];
    latest(state).forEach(function (_value, key, _map) {
      cb.call(thisArg, _this.get(key), key, _this);
    });
  };

  p.get = function (key) {
    var state = this[DRAFT_STATE];
    assertUnrevoked(state);
    var value = latest(state).get(key);

    if (state.finalized || !isDraftable(value)) {
      return value;
    }

    if (value !== state.base.get(key)) {
      return value; // either already drafted or reassigned
    } // despite what it looks, this creates a draft only once, see above condition


    var draft = state.scope.immer.createProxy(value, state);
    prepareCopy$2(state);
    state.copy.set(key, draft);
    return draft;
  };

  p.keys = function () {
    return latest(this[DRAFT_STATE]).keys();
  };

  p.values = function () {
    var _a;

    var _this = this;

    var iterator = this.keys();
    return _a = {}, _a[iteratorSymbol] = function () {
      return _this.values();
    }, _a.next = function () {
      var r = iterator.next();
      /* istanbul ignore next */

      if (r.done) { return r; }

      var value = _this.get(r.value);

      return {
        done: false,
        value: value
      };
    }, _a;
  };

  p.entries = function () {
    var _a;

    var _this = this;

    var iterator = this.keys();
    return _a = {}, _a[iteratorSymbol] = function () {
      return _this.entries();
    }, _a.next = function () {
      var r = iterator.next();
      /* istanbul ignore next */

      if (r.done) { return r; }

      var value = _this.get(r.value);

      return {
        done: false,
        value: [r.value, value]
      };
    }, _a;
  };

  p[iteratorSymbol] = function () {
    return this.entries();
  };

  return DraftMap;
}(Map);

function proxyMap(target, parent) {
  // @ts-ignore
  return new DraftMap(target, parent);
}

function prepareCopy$2(state) {
  if (!state.copy) {
    state.assigned = new Map();
    state.copy = new Map(state.base);
  }
}

var DraftSet = function (_super) {
  if (!_super) {
    /* istanbul ignore next */
    throw new Error("Set is not polyfilled");
  }

  __extends(DraftSet, _super); // Create class manually, cause #502


  function DraftSet(target, parent) {
    this[DRAFT_STATE] = {
      type: ProxyType.Set,
      parent: parent,
      scope: parent ? parent.scope : ImmerScope.current,
      modified: false,
      finalized: false,
      copy: undefined,
      base: target,
      draft: this,
      drafts: new Map(),
      revoked: false,
      isManual: false
    };
    return this;
  }

  var p = DraftSet.prototype;
  Object.defineProperty(p, "size", {
    get: function () {
      return latest(this[DRAFT_STATE]).size;
    },
    enumerable: true,
    configurable: true
  });

  p.has = function (value) {
    var state = this[DRAFT_STATE];
    assertUnrevoked(state); // bit of trickery here, to be able to recognize both the value, and the draft of its value

    if (!state.copy) {
      return state.base.has(value);
    }

    if (state.copy.has(value)) { return true; }
    if (state.drafts.has(value) && state.copy.has(state.drafts.get(value))) { return true; }
    return false;
  };

  p.add = function (value) {
    var state = this[DRAFT_STATE];
    assertUnrevoked(state);

    if (state.copy) {
      state.copy.add(value);
    } else if (!state.base.has(value)) {
      prepareCopy$3(state);
      state.scope.immer.markChanged(state);
      state.copy.add(value);
    }

    return this;
  };

  p.delete = function (value) {
    if (!this.has(value)) {
      return false;
    }

    var state = this[DRAFT_STATE];
    assertUnrevoked(state);
    prepareCopy$3(state);
    state.scope.immer.markChanged(state);
    return state.copy.delete(value) || (state.drafts.has(value) ? state.copy.delete(state.drafts.get(value)) :
    /* istanbul ignore next */
    false);
  };

  p.clear = function () {
    var state = this[DRAFT_STATE];
    assertUnrevoked(state);
    prepareCopy$3(state);
    state.scope.immer.markChanged(state);
    return state.copy.clear();
  };

  p.values = function () {
    var state = this[DRAFT_STATE];
    assertUnrevoked(state);
    prepareCopy$3(state);
    return state.copy.values();
  };

  p.entries = function entries() {
    var state = this[DRAFT_STATE];
    assertUnrevoked(state);
    prepareCopy$3(state);
    return state.copy.entries();
  };

  p.keys = function () {
    return this.values();
  };

  p[iteratorSymbol] = function () {
    return this.values();
  };

  p.forEach = function forEach(cb, thisArg) {
    var iterator = this.values();
    var result = iterator.next();

    while (!result.done) {
      cb.call(thisArg, result.value, result.value, this);
      result = iterator.next();
    }
  };

  return DraftSet;
}(Set);

function proxySet(target, parent) {
  // @ts-ignore
  return new DraftSet(target, parent);
}

function prepareCopy$3(state) {
  if (!state.copy) {
    // create drafts for all entries to preserve insertion order
    state.copy = new Set();
    state.base.forEach(function (value) {
      if (isDraftable(value)) {
        var draft = state.scope.immer.createProxy(value, state);
        state.drafts.set(value, draft);
        state.copy.add(draft);
      } else {
        state.copy.add(value);
      }
    });
  }
}

function generatePatches(state, basePath, patches, inversePatches) {
  switch (state.type) {
    case ProxyType.ProxyObject:
    case ProxyType.ES5Object:
    case ProxyType.Map:
      return generatePatchesFromAssigned(state, basePath, patches, inversePatches);

    case ProxyType.ES5Array:
    case ProxyType.ProxyArray:
      return generateArrayPatches(state, basePath, patches, inversePatches);

    case ProxyType.Set:
      return generateSetPatches(state, basePath, patches, inversePatches);
  }
}

function generateArrayPatches(state, basePath, patches, inversePatches) {
  var _a, _b;

  var base = state.base,
      assigned = state.assigned,
      copy = state.copy;
  /* istanbul ignore next */

  if (!copy) { die(); } // Reduce complexity by ensuring `base` is never longer.

  if (copy.length < base.length) {
    _a = [copy, base], base = _a[0], copy = _a[1];
    _b = [inversePatches, patches], patches = _b[0], inversePatches = _b[1];
  }

  var delta = copy.length - base.length; // Find the first replaced index.

  var start = 0;

  while (base[start] === copy[start] && start < base.length) {
    ++start;
  } // Find the last replaced index. Search from the end to optimize splice patches.


  var end = base.length;

  while (end > start && base[end - 1] === copy[end + delta - 1]) {
    --end;
  } // Process replaced indices.


  for (var i = start; i < end; ++i) {
    if (assigned[i] && copy[i] !== base[i]) {
      var path = basePath.concat([i]);
      patches.push({
        op: "replace",
        path: path,
        value: copy[i]
      });
      inversePatches.push({
        op: "replace",
        path: path,
        value: base[i]
      });
    }
  }

  var replaceCount = patches.length; // Process added indices.

  for (var i = end + delta - 1; i >= end; --i) {
    var path = basePath.concat([i]);
    patches[replaceCount + i - end] = {
      op: "add",
      path: path,
      value: copy[i]
    };
    inversePatches.push({
      op: "remove",
      path: path
    });
  }
} // This is used for both Map objects and normal objects.


function generatePatchesFromAssigned(state, basePath, patches, inversePatches) {
  var base = state.base,
      copy = state.copy;
  each(state.assigned, function (key, assignedValue) {
    var origValue = get(base, key);
    var value = get(copy, key);
    var op = !assignedValue ? "remove" : has(base, key) ? "replace" : "add";
    if (origValue === value && op === "replace") { return; }
    var path = basePath.concat(key);
    patches.push(op === "remove" ? {
      op: op,
      path: path
    } : {
      op: op,
      path: path,
      value: value
    });
    inversePatches.push(op === "add" ? {
      op: "remove",
      path: path
    } : op === "remove" ? {
      op: "add",
      path: path,
      value: origValue
    } : {
      op: "replace",
      path: path,
      value: origValue
    });
  });
}

function generateSetPatches(state, basePath, patches, inversePatches) {
  var base = state.base,
      copy = state.copy;
  var i = 0;
  base.forEach(function (value) {
    if (!copy.has(value)) {
      var path = basePath.concat([i]);
      patches.push({
        op: "remove",
        path: path,
        value: value
      });
      inversePatches.unshift({
        op: "add",
        path: path,
        value: value
      });
    }

    i++;
  });
  i = 0;
  copy.forEach(function (value) {
    if (!base.has(value)) {
      var path = basePath.concat([i]);
      patches.push({
        op: "add",
        path: path,
        value: value
      });
      inversePatches.unshift({
        op: "remove",
        path: path,
        value: value
      });
    }

    i++;
  });
}

function applyPatches(draft, patches) {
  patches.forEach(function (patch) {
    var path = patch.path,
        op = patch.op;
    /* istanbul ignore next */

    if (!path.length) { die(); }
    var base = draft;

    for (var i = 0; i < path.length - 1; i++) {
      base = get(base, path[i]);
      if (!base || typeof base !== "object") { throw new Error("Cannot apply patch, path doesn't resolve: " + path.join("/")); } // prettier-ignore
    }

    var type = getArchtype(base);
    var value = deepClonePatchValue(patch.value); // used to clone patch to ensure original patch is not modified, see #411

    var key = path[path.length - 1];

    switch (op) {
      case "replace":
        switch (type) {
          case Archtype.Map:
            return base.set(key, value);

          /* istanbul ignore next */

          case Archtype.Set:
            throw new Error('Sets cannot have "replace" patches.');

          default:
            // if value is an object, then it's assigned by reference
            // in the following add or remove ops, the value field inside the patch will also be modifyed
            // so we use value from the cloned patch
            // @ts-ignore
            return base[key] = value;
        }

      case "add":
        switch (type) {
          case Archtype.Array:
            return base.splice(key, 0, value);

          case Archtype.Map:
            return base.set(key, value);

          case Archtype.Set:
            return base.add(value);

          default:
            return base[key] = value;
        }

      case "remove":
        switch (type) {
          case Archtype.Array:
            return base.splice(key, 1);

          case Archtype.Map:
            return base.delete(key);

          case Archtype.Set:
            return base.delete(patch.value);

          default:
            return delete base[key];
        }

      default:
        throw new Error("Unsupported patch operation: " + op);
    }
  });
  return draft;
}

function deepClonePatchValue(obj) {
  if (!obj || typeof obj !== "object") { return obj; }
  if (Array.isArray(obj)) { return obj.map(deepClonePatchValue); }
  if (isMap(obj)) { return new Map(Array.from(obj.entries()).map(function (_a) {
    var k = _a[0],
        v = _a[1];
    return [k, deepClonePatchValue(v)];
  })); } // Not needed: if (isSet(obj)) return new Set(Array.from(obj.values()).map(deepClone))

  var cloned = Object.create(Object.getPrototypeOf(obj));

  for (var key in obj) { cloned[key] = deepClonePatchValue(obj[key]); }

  return cloned;
}

/*! *****************************************************************************
Copyright (c) Microsoft Corporation. All rights reserved.
Licensed under the Apache License, Version 2.0 (the "License"); you may not use
this file except in compliance with the License. You may obtain a copy of the
License at http://www.apache.org/licenses/LICENSE-2.0

THIS CODE IS PROVIDED ON AN *AS IS* BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
KIND, EITHER EXPRESS OR IMPLIED, INCLUDING WITHOUT LIMITATION ANY IMPLIED
WARRANTIES OR CONDITIONS OF TITLE, FITNESS FOR A PARTICULAR PURPOSE,
MERCHANTABLITY OR NON-INFRINGEMENT.

See the Apache Version 2.0 License for specific language governing permissions
and limitations under the License.
***************************************************************************** */

function __spreadArrays() {
    for (var s = 0, i = 0, il = arguments.length; i < il; i++) s += arguments[i].length;
    for (var r = Array(s), k = 0, i = 0; i < il; i++)
        for (var a = arguments[i], j = 0, jl = a.length; j < jl; j++, k++)
            r[k] = a[j];
    return r;
}

/* istanbul ignore next */

function verifyMinified() {}

var configDefaults = {
  useProxies: typeof Proxy !== "undefined" && typeof Proxy.revocable !== "undefined" && typeof Reflect !== "undefined",
  autoFreeze: typeof process !== "undefined" ? "development" !== "production" :
  /* istanbul ignore next */
  verifyMinified.name === "verifyMinified",
  onAssign: null,
  onDelete: null,
  onCopy: null
};

var Immer =
/** @class */
function () {
  function Immer(config) {
    var _this = this;

    this.useProxies = false;
    this.autoFreeze = false;
    each(configDefaults, function (key, value) {
      var _a, _b; // @ts-ignore


      _this[key] = (_b = (_a = config) === null || _a === void 0 ? void 0 : _a[key], _b !== null && _b !== void 0 ? _b : value);
    });
    this.setUseProxies(this.useProxies);
    this.produce = this.produce.bind(this);
    this.produceWithPatches = this.produceWithPatches.bind(this);
  }
  /**
   * The `produce` function takes a value and a "recipe function" (whose
   * return value often depends on the base state). The recipe function is
   * free to mutate its first argument however it wants. All mutations are
   * only ever applied to a __copy__ of the base state.
   *
   * Pass only a function to create a "curried producer" which relieves you
   * from passing the recipe function every time.
   *
   * Only plain objects and arrays are made mutable. All other objects are
   * considered uncopyable.
   *
   * Note: This function is __bound__ to its `Immer` instance.
   *
   * @param {any} base - the initial state
   * @param {Function} producer - function that receives a proxy of the base state as first argument and which can be freely modified
   * @param {Function} patchListener - optional function that will be called with all the patches produced here
   * @returns {any} a new state, or the initial state if nothing was modified
   */


  Immer.prototype.produce = function (base, recipe, patchListener) {
    var _this = this; // curried invocation


    if (typeof base === "function" && typeof recipe !== "function") {
      var defaultBase_1 = recipe;
      recipe = base;
      var self_1 = this;
      return function curriedProduce(base) {
        var arguments$1 = arguments;

        var _this = this;

        if (base === void 0) {
          base = defaultBase_1;
        }

        var args = [];

        for (var _i = 1; _i < arguments.length; _i++) {
          args[_i - 1] = arguments$1[_i];
        }

        return self_1.produce(base, function (draft) {
          return recipe.call.apply(recipe, __spreadArrays([_this, draft], args));
        }); // prettier-ignore
      };
    } // prettier-ignore


    {
      if (typeof recipe !== "function") {
        throw new Error("The first or second argument to `produce` must be a function");
      }

      if (patchListener !== undefined && typeof patchListener !== "function") {
        throw new Error("The third argument to `produce` must be a function or undefined");
      }
    }
    var result; // Only plain objects, arrays, and "immerable classes" are drafted.

    if (isDraftable(base)) {
      var scope_1 = ImmerScope.enter(this);
      var proxy = this.createProxy(base, undefined);
      var hasError = true;

      try {
        result = recipe(proxy);
        hasError = false;
      } finally {
        // finally instead of catch + rethrow better preserves original stack
        if (hasError) { scope_1.revoke(); }else { scope_1.leave(); }
      }

      if (typeof Promise !== "undefined" && result instanceof Promise) {
        return result.then(function (result) {
          scope_1.usePatches(patchListener);
          return processResult(_this, result, scope_1);
        }, function (error) {
          scope_1.revoke();
          throw error;
        });
      }

      scope_1.usePatches(patchListener);
      return processResult(this, result, scope_1);
    } else {
      result = recipe(base);
      if (result === NOTHING) { return undefined; }
      if (result === undefined) { result = base; }
      maybeFreeze(this, result, true);
      return result;
    }
  };

  Immer.prototype.produceWithPatches = function (arg1, arg2, arg3) {
    var _this = this;

    if (typeof arg1 === "function") {
      return function (state) {
        var arguments$1 = arguments;

        var args = [];

        for (var _i = 1; _i < arguments.length; _i++) {
          args[_i - 1] = arguments$1[_i];
        }

        return _this.produceWithPatches(state, function (draft) {
          return arg1.apply(void 0, __spreadArrays([draft], args));
        });
      };
    } // non-curried form

    /* istanbul ignore next */


    if (arg3) { die(); }
    var patches, inversePatches;
    var nextState = this.produce(arg1, arg2, function (p, ip) {
      patches = p;
      inversePatches = ip;
    });
    return [nextState, patches, inversePatches];
  };

  Immer.prototype.createDraft = function (base) {
    if (!isDraftable(base)) {
      throw new Error("First argument to `createDraft` must be a plain object, an array, or an immerable object"); // prettier-ignore
    }

    var scope = ImmerScope.enter(this);
    var proxy = this.createProxy(base, undefined);
    proxy[DRAFT_STATE].isManual = true;
    scope.leave();
    return proxy;
  };

  Immer.prototype.finishDraft = function (draft, patchListener) {
    var state = draft && draft[DRAFT_STATE];

    if (!state || !state.isManual) {
      throw new Error("First argument to `finishDraft` must be a draft returned by `createDraft`"); // prettier-ignore
    }

    if (state.finalized) {
      throw new Error("The given draft is already finalized"); // prettier-ignore
    }

    var scope = state.scope;
    scope.usePatches(patchListener);
    return processResult(this, undefined, scope);
  };
  /**
   * Pass true to automatically freeze all copies created by Immer.
   *
   * By default, auto-freezing is disabled in production.
   */


  Immer.prototype.setAutoFreeze = function (value) {
    this.autoFreeze = value;
  };
  /**
   * Pass true to use the ES2015 `Proxy` class when creating drafts, which is
   * always faster than using ES5 proxies.
   *
   * By default, feature detection is used, so calling this is rarely necessary.
   */


  Immer.prototype.setUseProxies = function (value) {
    this.useProxies = value;
  };

  Immer.prototype.applyPatches = function (base, patches) {
    // If a patch replaces the entire state, take that replacement as base
    // before applying patches
    var i;

    for (i = patches.length - 1; i >= 0; i--) {
      var patch = patches[i];

      if (patch.path.length === 0 && patch.op === "replace") {
        base = patch.value;
        break;
      }
    }

    if (isDraft(base)) {
      // N.B: never hits if some patch a replacement, patches are never drafts
      return applyPatches(base, patches);
    } // Otherwise, produce a copy of the base state.


    return this.produce(base, function (draft) {
      return applyPatches(draft, patches.slice(i + 1));
    });
  };

  Immer.prototype.createProxy = function (value, parent) {
    // precondition: createProxy should be guarded by isDraftable, so we know we can safely draft
    var draft = isMap(value) ? proxyMap(value, parent) : isSet(value) ? proxySet(value, parent) : this.useProxies ? createProxy(value, parent) : createES5Proxy(value, parent);
    var scope = parent ? parent.scope : ImmerScope.current;
    scope.drafts.push(draft);
    return draft;
  };

  Immer.prototype.willFinalize = function (scope, thing, isReplaced) {
    if (!this.useProxies) { willFinalizeES5(scope, thing, isReplaced); }
  };

  Immer.prototype.markChanged = function (state) {
    if (this.useProxies) {
      markChanged(state);
    } else {
      markChangedES5(state);
    }
  };

  return Immer;
}();

var immer = new Immer();
/**
 * The `produce` function takes a value and a "recipe function" (whose
 * return value often depends on the base state). The recipe function is
 * free to mutate its first argument however it wants. All mutations are
 * only ever applied to a __copy__ of the base state.
 *
 * Pass only a function to create a "curried producer" which relieves you
 * from passing the recipe function every time.
 *
 * Only plain objects and arrays are made mutable. All other objects are
 * considered uncopyable.
 *
 * Note: This function is __bound__ to its `Immer` instance.
 *
 * @param {any} base - the initial state
 * @param {Function} producer - function that receives a proxy of the base state as first argument and which can be freely modified
 * @param {Function} patchListener - optional function that will be called with all the patches produced here
 * @returns {any} a new state, or the initial state if nothing was modified
 */

var produce = immer.produce;
/**
 * Like `produce`, but `produceWithPatches` always returns a tuple
 * [nextState, patches, inversePatches] (instead of just the next state)
 */

var produceWithPatches = immer.produceWithPatches.bind(immer);
/**
 * Pass true to automatically freeze all copies created by Immer.
 *
 * By default, auto-freezing is disabled in production.
 */

var setAutoFreeze = immer.setAutoFreeze.bind(immer);
/**
 * Pass true to use the ES2015 `Proxy` class when creating drafts, which is
 * always faster than using ES5 proxies.
 *
 * By default, feature detection is used, so calling this is rarely necessary.
 */

var setUseProxies = immer.setUseProxies.bind(immer);
/**
 * Apply an array of Immer patches to the first argument.
 *
 * This function is a producer, which means copy-on-write is in effect.
 */

var applyPatches$1 = immer.applyPatches.bind(immer);
/**
 * Create an Immer draft from the given base state, which may be a draft itself.
 * The draft can be modified until you finalize it with the `finishDraft` function.
 */

var createDraft = immer.createDraft.bind(immer);
/**
 * Finalize an Immer draft from a `createDraft` call, returning the base state
 * (if no changes were made) or a modified copy. The draft must *not* be
 * mutated afterwards.
 *
 * Pass a function as the 2nd argument to generate Immer patches based on the
 * changes that were made.
 */

var finishDraft = immer.finishDraft.bind(immer);
/**
 * This function is actually a no-op, but can be used to cast an immutable type
 * to an draft type and make TypeScript happy
 *
 * @param value
 */

function castDraft(value) {
  return value;
}
/**
 * This function is actually a no-op, but can be used to cast a mutable type
 * to an immutable type and make TypeScript happy
 * @param value
 */

function castImmutable(value) {
  return value;
}

export default produce;
export { Immer, applyPatches$1 as applyPatches, castDraft, castImmutable, createDraft, finishDraft, DRAFTABLE as immerable, isDraft, isDraftable, NOTHING as nothing, original, produce, produceWithPatches, setAutoFreeze, setUseProxies };

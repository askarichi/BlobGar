"use strict";
const fs = require("fs");
const path = require("path");
const Log = require("./Logger");

class ProfileProgressStore {
    constructor(filePath) {
        this.filePath = filePath;
        this.data = this.createEmptyStore();
        this.load();
    }
    createEmptyStore() {
        return {
            version: 4,
            updatedAt: null,
            profiles: {}
        };
    }
    ensureDirectory() {
        fs.mkdirSync(path.dirname(this.filePath), {
            recursive: true
        });
    }
    load() {
        this.ensureDirectory();
        if (!fs.existsSync(this.filePath)) return this.save();
        try {
            let raw = fs.readFileSync(this.filePath, "utf8"),
                parsed = JSON.parse(raw);
            this.data = Object.assign(this.createEmptyStore(), parsed || {});
            this.data.profiles = this.data.profiles || {};
        } catch (error) {
            Log.error("ProfileProgressStore: Failed to load profile progress - " + error.message);
            this.data = this.createEmptyStore();
            this.save();
        }
    }
    save() {
        try {
            this.ensureDirectory();
            this.data.updatedAt = new Date().toISOString();
            fs.writeFileSync(this.filePath, JSON.stringify(this.data, null, 2), "utf8");
        } catch (error) {
            Log.error("ProfileProgressStore: Failed to save profile progress - " + error.message);
        }
    }
    normalizeKey(value) {
        return String(value || "").trim().toLowerCase();
    }
    sanitizeName(name) {
        return ((String(name || "").trim()) || "Pilot-07").slice(0, 30);
    }
    sanitizeAccountKey(accountKey, fallbackName) {
        let normalized = this.normalizeKey(accountKey);
        if (normalized) return normalized;
        return "legacy:" + this.normalizeKey(this.sanitizeName(fallbackName));
    }
    getAbilityKeys() {
        return [
            "speed",
            "mass",
            "shieldCooldown",
            "shieldDuration",
            "spikeCooldown",
            "freezeCooldown",
            "freezeDuration",
            "splitCooldown",
            "massEjectCooldown"
        ];
    }
    getLiveAbilityKeys() {
        return [
            "speed",
            "mass",
            "shieldCooldown",
            "shieldDuration",
            "spikeCooldown",
            "freezeCooldown",
            "freezeDuration",
            "massEjectCooldown"
        ];
    }
    createAbilities() {
        let abilities = {};
        for (let i = 0; i < this.getAbilityKeys().length; i++) abilities[this.getAbilityKeys()[i]] = 0;
        return abilities;
    }
    getResourceKeys() {
        return [
            "freezes",
            "shields",
            "spikes"
        ];
    }
    getStarterResources() {
        return {
            freezes: 20,
            shields: 20,
            spikes: 20
        };
    }
    createResources() {
        let resources = {};
        for (let i = 0; i < this.getResourceKeys().length; i++) resources[this.getResourceKeys()[i]] = 0;
        return resources;
    }
    resolveIdentity(input) {
        if (input && typeof input === "object") {
            let safeName = this.sanitizeName(input.name || input.displayName || "Pilot-07");
            return {
                accountKey: this.sanitizeAccountKey(input.accountKey, safeName),
                name: safeName,
                authProvider: String(input.authProvider || input.provider || "guest").trim() || "guest",
                nameLocked: !!input.nameLocked,
                telegramUserId: input.telegramUserId ? String(input.telegramUserId) : null
            };
        }
        if (typeof input === "string" && input) {
            let rawInput = String(input).trim();
            if (this.data && this.data.profiles && this.data.profiles[rawInput]) {
                let profile = this.normalizeProfile(this.data.profiles[rawInput], {
                    accountKey: rawInput,
                    name: this.data.profiles[rawInput] && this.data.profiles[rawInput].name ? this.data.profiles[rawInput].name : rawInput
                });
                return {
                    accountKey: rawInput,
                    name: profile.name,
                    authProvider: profile.authProvider || "guest",
                    nameLocked: !!profile.nameLocked,
                    telegramUserId: profile.telegramUserId || null
                };
            }
            if (/^[a-z0-9_-]+:/i.test(rawInput)) {
                let provider = rawInput.split(":")[0].toLowerCase(),
                    safeName = this.sanitizeName("Pilot-07");
                return {
                    accountKey: this.sanitizeAccountKey(rawInput, safeName),
                    name: safeName,
                    authProvider: provider || "legacy",
                    nameLocked: provider === "telegram",
                    telegramUserId: provider === "telegram" ? rawInput.slice(rawInput.indexOf(":") + 1) : null
                };
            }
        }
        return {
            accountKey: "",
            name: this.sanitizeName(input || "Pilot-07"),
            authProvider: "legacy",
            nameLocked: false,
            telegramUserId: null
        };
    }
    createProfile(identityInput) {
        let identity = this.resolveIdentity(identityInput),
            now = new Date().toISOString();
        return {
            accountKey: this.sanitizeAccountKey(identity.accountKey, identity.name),
            name: identity.name,
            authProvider: identity.authProvider,
            nameLocked: identity.nameLocked,
            telegramUserId: identity.telegramUserId,
            createdAt: now,
            coins: 0,
            totalXp: 0,
            gamesPlayed: 0,
            totalWins: 0,
            totalKills: 0,
            totalFoodCollected: 0,
            totalTimePlayedSeconds: 0,
            lastCoinsAwarded: 0,
            lastXpAwarded: 0,
            lastSeen: null,
            skin: "Base",
            lastRun: null,
            abilities: this.createAbilities(),
            resources: this.createResources(),
            starterResourcesGranted: false
        };
    }
    normalizeProfile(profile, identityInput) {
        let identity = this.resolveIdentity(identityInput),
            normalized = Object.assign(this.createProfile(identity), profile || {});
        normalized.accountKey = normalized.accountKey ? this.sanitizeAccountKey(normalized.accountKey, normalized.name || identity.name) : identity.accountKey;
        normalized.name = this.sanitizeName(normalized.name || identity.name);
        normalized.authProvider = String(normalized.authProvider || identity.authProvider || "guest").trim() || "guest";
        normalized.nameLocked = !!(normalized.nameLocked != null ? normalized.nameLocked : identity.nameLocked);
        normalized.telegramUserId = normalized.telegramUserId ? String(normalized.telegramUserId) : identity.telegramUserId;
        normalized.skin = ((normalized.skin || "").trim()) || "Base";
        normalized.abilities = Object.assign(this.createAbilities(), normalized.abilities || {});
        normalized.resources = Object.assign(this.createResources(), normalized.resources || {});
        normalized.starterResourcesGranted = !!normalized.starterResourcesGranted;
        return normalized;
    }
    applyStarterResources(profile) {
        if (!profile || profile.starterResourcesGranted) return false;
        let starter = this.getStarterResources(),
            changed = false,
            resourceKeys = this.getResourceKeys();
        profile.resources = Object.assign(this.createResources(), profile.resources || {});
        for (let i = 0; i < resourceKeys.length; i++) {
            let key = resourceKeys[i],
                current = Math.max(0, Math.round(profile.resources[key] || 0)),
                target = Math.max(current, Math.round(starter[key] || 0));
            if (target !== current) {
                profile.resources[key] = target;
                changed = true;
            }
        }
        profile.starterResourcesGranted = true;
        return true;
    }
    getAbilityCost(level) {
        let safeLevel = Math.max(0, Math.round(level || 0));
        return Math.round(50 * Math.pow(2, safeLevel));
    }
    findKeyByName(name) {
        let safeName = this.normalizeKey(this.sanitizeName(name));
        if (!safeName) return "";
        let keys = Object.keys(this.data.profiles || {});
        for (let i = 0; i < keys.length; i++) {
            let key = keys[i],
                profile = this.data.profiles[key];
            if (!profile) continue;
            if (this.normalizeKey(profile.name) === safeName) return key;
        }
        return "";
    }
    findKey(identityInput) {
        let identity = this.resolveIdentity(identityInput);
        if (identity.accountKey && this.data.profiles[identity.accountKey]) return identity.accountKey;
        let legacyKey = this.findKeyByName(identity.name);
        return legacyKey || "";
    }
    hasProfile(identityInput) {
        return !!this.findKey(identityInput);
    }
    ensureProfile(identityInput) {
        let identity = this.resolveIdentity(identityInput),
            key = identity.accountKey || this.findKey(identity),
            changed = false;
        if (identity.accountKey && this.data.profiles[identity.accountKey]) key = identity.accountKey;
        else if (identity.accountKey && !this.data.profiles[identity.accountKey]) {
            let legacyKey = this.findKeyByName(identity.name);
            if (legacyKey && legacyKey !== identity.accountKey) {
                this.data.profiles[identity.accountKey] = this.normalizeProfile(this.data.profiles[legacyKey], identity);
                delete this.data.profiles[legacyKey];
                key = identity.accountKey;
                changed = true;
            }
        }
        if (!key) {
            key = identity.accountKey || this.sanitizeAccountKey("", identity.name);
            this.data.profiles[key] = this.createProfile(identity);
            changed = true;
        } else this.data.profiles[key] = this.normalizeProfile(this.data.profiles[key], identity);
        if (identity.accountKey && this.data.profiles[key].accountKey !== identity.accountKey) {
            this.data.profiles[key].accountKey = identity.accountKey;
            changed = true;
        }
        if (identity.name && this.data.profiles[key].name !== identity.name) {
            this.data.profiles[key].name = identity.name;
            changed = true;
        }
        if (identity.authProvider && this.data.profiles[key].authProvider !== identity.authProvider) {
            this.data.profiles[key].authProvider = identity.authProvider;
            changed = true;
        }
        if (this.data.profiles[key].nameLocked !== identity.nameLocked) {
            this.data.profiles[key].nameLocked = !!identity.nameLocked;
            changed = true;
        }
        if ((identity.telegramUserId || null) !== (this.data.profiles[key].telegramUserId || null)) {
            this.data.profiles[key].telegramUserId = identity.telegramUserId || null;
            changed = true;
        }
        if (this.applyStarterResources(this.data.profiles[key])) changed = true;
        if (changed) this.save();
        return this.data.profiles[key];
    }
    touchProfile(identityInput, patch) {
        let identity = this.resolveIdentity(identityInput),
            profile = this.ensureProfile(identity),
            updates = patch || {};
        if (updates.name != null && !profile.nameLocked) profile.name = this.sanitizeName(updates.name);
        if (typeof updates.coins === "number" && isFinite(updates.coins)) profile.coins = Math.max(0, Math.round(updates.coins));
        if (updates.skin != null) profile.skin = ((updates.skin || "").trim() || "Base");
        if (updates.resources && typeof updates.resources === "object") {
            let resourceKeys = this.getResourceKeys();
            for (let i = 0; i < resourceKeys.length; i++) {
                let key = resourceKeys[i];
                if (typeof updates.resources[key] === "number" && isFinite(updates.resources[key])) profile.resources[key] = Math.max(0, Math.round(updates.resources[key]));
            }
        }
        if (updates.lastSeen != null) profile.lastSeen = updates.lastSeen;
        if (updates.authProvider != null) profile.authProvider = String(updates.authProvider || profile.authProvider || "guest");
        if (updates.nameLocked != null) profile.nameLocked = !!updates.nameLocked;
        if (updates.telegramUserId !== undefined) profile.telegramUserId = updates.telegramUserId ? String(updates.telegramUserId) : null;
        this.save();
        return this.buildSummary(identity);
    }
    setResourceCount(identityInput, resourceKey, amount) {
        if (this.getResourceKeys().indexOf(resourceKey) === -1) return {
            ok: false,
            error: "Unknown resource."
        };
        let identity = this.resolveIdentity(identityInput),
            profile = this.ensureProfile(identity);
        profile.resources[resourceKey] = Math.max(0, Math.round(amount || 0));
        this.save();
        return {
            ok: true,
            resourceKey: resourceKey,
            summary: this.buildSummary(identity)
        };
    }
    consumeResource(identityInput, resourceKey, amount) {
        if (this.getResourceKeys().indexOf(resourceKey) === -1) return {
            ok: false,
            error: "Unknown resource."
        };
        let identity = this.resolveIdentity(identityInput),
            profile = this.ensureProfile(identity),
            spend = Math.max(1, Math.round(amount || 1)),
            current = Math.max(0, Math.round(profile.resources[resourceKey] || 0));
        if (current < spend) return {
            ok: false,
            error: "Not enough resource charges.",
            resourceKey: resourceKey,
            currentAmount: current,
            summary: this.buildSummary(identity)
        };
        profile.resources[resourceKey] = current - spend;
        this.save();
        return {
            ok: true,
            resourceKey: resourceKey,
            spent: spend,
            summary: this.buildSummary(identity)
        };
    }
    findProfiles(query, limit) {
        let safeQuery = ((query || "").trim()).toLowerCase(),
            results = Object.keys(this.data.profiles || {}).map(key => this.normalizeProfile(this.data.profiles[key], {
                accountKey: key,
                name: this.data.profiles[key] && this.data.profiles[key].name ? this.data.profiles[key].name : key
            }));
        if (safeQuery) results = results.filter(profile => profile.name.toLowerCase().indexOf(safeQuery) >= 0 || String(profile.accountKey || "").toLowerCase().indexOf(safeQuery) >= 0);
        results.sort((left, right) => {
            let leftSeen = Date.parse(left.lastSeen || left.createdAt || 0) || 0,
                rightSeen = Date.parse(right.lastSeen || right.createdAt || 0) || 0;
            if (rightSeen !== leftSeen) return rightSeen - leftSeen;
            return String(left.name || "").localeCompare(String(right.name || ""));
        });
        return results.slice(0, Math.max(1, Math.min(50, limit || 25)));
    }
    buildAbilitiesSummary(profile) {
        let source = profile && profile.abilities ? profile.abilities : this.createAbilities(),
            liveLookup = {},
            result = {};
        for (let i = 0; i < this.getLiveAbilityKeys().length; i++) liveLookup[this.getLiveAbilityKeys()[i]] = true;
        for (let i = 0; i < this.getAbilityKeys().length; i++) {
            let key = this.getAbilityKeys()[i],
                level = Math.max(0, Math.min(50, Math.round(source[key] || 0))),
                isLive = !!liveLookup[key];
            result[key] = {
                level: level,
                maxLevel: 50,
                nextCost: level >= 50 ? 0 : this.getAbilityCost(level),
                isLive: isLive,
                status: isLive ? "live" : "comingSoon"
            };
        }
        return result;
    }
    recordRun(run) {
        if (!run || (!run.accountKey && !run.name)) return this.buildSummary("Pilot-07");
        let identity = this.resolveIdentity({
                accountKey: run.accountKey,
                name: run.name,
                authProvider: run.authProvider || "guest",
                nameLocked: !!run.nameLocked,
                telegramUserId: run.telegramUserId || null
            }),
            profile = this.ensureProfile(identity),
            safeCoins = Math.max(0, Math.round(run.coinsAwarded || 0)),
            safeXp = Math.max(0, Math.round(run.xpAwarded || 0)),
            safeSkin = ((run.skin || profile.skin || "Base") + "").trim() || "Base";
        profile.name = identity.name;
        profile.skin = safeSkin;
        profile.coins = Math.max(0, Math.round((profile.coins || 0) + safeCoins));
        profile.totalXp = Math.max(0, Math.round((profile.totalXp || 0) + safeXp));
        profile.gamesPlayed = (profile.gamesPlayed || 0) + 1;
        profile.totalWins = (profile.totalWins || 0) + (run.won ? 1 : 0);
        profile.totalKills = (profile.totalKills || 0) + Math.max(0, Math.round(run.kills || 0));
        profile.totalFoodCollected = (profile.totalFoodCollected || 0) + Math.max(0, Math.round(run.foodCollected || 0));
        profile.totalTimePlayedSeconds = (profile.totalTimePlayedSeconds || 0) + Math.max(0, Math.round(run.timePlayedSeconds || 0));
        profile.lastCoinsAwarded = safeCoins;
        profile.lastXpAwarded = safeXp;
        profile.lastSeen = run.finishedAt || new Date().toISOString();
        profile.lastRun = {
            score: Math.max(0, Math.round(run.score || 0)),
            kills: Math.max(0, Math.round(run.kills || 0)),
            foodCollected: Math.max(0, Math.round(run.foodCollected || 0)),
            won: !!run.won,
            timePlayedSeconds: Math.max(0, Math.round(run.timePlayedSeconds || 0)),
            coinsAwarded: safeCoins,
            xpAwarded: safeXp,
            finishedAt: run.finishedAt || new Date().toISOString()
        };
        this.save();
        return this.buildSummary(identity);
    }
    upgradeAbility(identityInput, abilityKey) {
        if (this.getAbilityKeys().indexOf(abilityKey) === -1) return {
            ok: false,
            error: "Unknown ability."
        };
        let identity = this.resolveIdentity(identityInput),
            profile = this.ensureProfile(identity),
            isLive = this.getLiveAbilityKeys().indexOf(abilityKey) >= 0,
            currentLevel = Math.max(0, Math.min(50, Math.round(profile.abilities[abilityKey] || 0)));
        if (!isLive) return {
            ok: false,
            error: "This ability is reserved for a future gameplay system and is not upgradeable yet.",
            summary: this.buildSummary(identity)
        };
        if (currentLevel >= 50) return {
            ok: false,
            error: "Ability already at max level."
        };
        let cost = this.getAbilityCost(currentLevel),
            currentCoins = Math.max(0, Math.round(profile.coins || 0));
        if (currentCoins < cost) return {
            ok: false,
            error: "Not enough coins.",
            requiredCoins: cost,
            currentCoins: currentCoins,
            summary: this.buildSummary(identity)
        };
        profile.coins = currentCoins - cost;
        profile.abilities[abilityKey] = currentLevel + 1;
        this.save();
        return {
            ok: true,
            abilityKey: abilityKey,
            spentCoins: cost,
            summary: this.buildSummary(identity)
        };
    }
    buildSummary(identityInput) {
        let profile = null,
            identity = this.resolveIdentity(identityInput),
            key = "";
        if (identity.accountKey) {
            profile = this.ensureProfile(identity);
            key = identity.accountKey;
        } else {
            key = this.findKey(identity);
            profile = key && this.data.profiles[key] ? this.normalizeProfile(this.data.profiles[key], {
                accountKey: key,
                name: identity.name
            }) : this.createProfile(identity);
        }
        return {
            updatedAt: this.data.updatedAt || new Date().toISOString(),
            accountKey: key || profile.accountKey || "",
            authProvider: profile.authProvider || "guest",
            nameLocked: !!profile.nameLocked,
            telegramUserId: profile.telegramUserId || null,
            name: profile.name,
            coins: Math.max(0, Math.round(profile.coins || 0)),
            totalXp: Math.max(0, Math.round(profile.totalXp || 0)),
            gamesPlayed: Math.max(0, Math.round(profile.gamesPlayed || 0)),
            totalWins: Math.max(0, Math.round(profile.totalWins || 0)),
            totalKills: Math.max(0, Math.round(profile.totalKills || 0)),
            totalFoodCollected: Math.max(0, Math.round(profile.totalFoodCollected || 0)),
            totalTimePlayedSeconds: Math.max(0, Math.round(profile.totalTimePlayedSeconds || 0)),
            lastCoinsAwarded: Math.max(0, Math.round(profile.lastCoinsAwarded || 0)),
            lastXpAwarded: Math.max(0, Math.round(profile.lastXpAwarded || 0)),
            lastSeen: profile.lastSeen || null,
            skin: profile.skin || "Base",
            lastRun: profile.lastRun || null,
            abilities: this.buildAbilitiesSummary(profile),
            resources: Object.assign(this.createResources(), profile.resources || {})
        };
    }
}

module.exports = ProfileProgressStore;

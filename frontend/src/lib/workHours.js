export const WEEKDAY_OPTIONS = [
    { key: "mon", label: "Ma" },
    { key: "tue", label: "Di" },
    { key: "wed", label: "Wo" },
    { key: "thu", label: "Do" },
    { key: "fri", label: "Vr" },
    { key: "sat", label: "Za" },
    { key: "sun", label: "Zo" },
];

export function createDefaultWorkdaySelection() {
    return {
        mon: true,
        tue: true,
        wed: true,
        thu: true,
        fri: true,
        sat: false,
        sun: false,
    };
}

export function createDefaultWorkHoursDraft() {
    return {
        selectedWorkdays: createDefaultWorkdaySelection(),
        breakHours: 0,
        breakMinutes: 50,
        startTime: "09:00",
        endTime: "17:00",
        autoStartWorkTimer: true,
        lunchPauseEnabled: false,
        lunchStart: "12:00",
        lunchEnd: "13:00",
    };
}

export function parseIntegerValue(value) {
    if (value === "") {
        return 0;
    }

    const parsedValue = Number.parseInt(value, 10);
    return Number.isNaN(parsedValue) || parsedValue < 0 ? 0 : parsedValue;
}

export function normalizeDuration(hoursValue, minutesValue) {
    const safeHours = Math.max(0, parseIntegerValue(hoursValue));
    const safeMinutes = Math.max(0, parseIntegerValue(minutesValue));
    const carriedHours = Math.floor(safeMinutes / 60);
    const normalizedMinutes = safeMinutes % 60;
    const normalizedHours = safeHours + carriedHours;

    return {
        hours: normalizedHours,
        minutes: normalizedMinutes,
        totalMinutes: normalizedHours * 60 + normalizedMinutes,
    };
}

function parseTimeToMinutes(value) {
    if (typeof value !== "string") {
        return NaN;
    }

    const [hoursPart, minutesPart] = value.split(":");
    const hours = Number.parseInt(hoursPart, 10);
    const minutes = Number.parseInt(minutesPart, 10);

    if (!Number.isFinite(hours) || !Number.isFinite(minutes)) {
        return NaN;
    }

    return hours * 60 + minutes;
}

export function isValidWorkdayTimeRange(startTime, endTime) {
    const startMinutes = parseTimeToMinutes(startTime);
    const endMinutes = parseTimeToMinutes(endTime);

    return Number.isFinite(startMinutes) && Number.isFinite(endMinutes) && startMinutes < endMinutes;
}

export function buildWorkDays(selectedWorkdays) {
    return WEEKDAY_OPTIONS.filter((day) => selectedWorkdays?.[day.key]).map((day) => day.key);
}

export function buildWorkHoursFields(draft) {
    const normalizedDuration = normalizeDuration(draft.breakHours, draft.breakMinutes);

    return {
        workdays: buildWorkDays(draft.selectedWorkdays),
        start_time: draft.startTime,
        end_time: draft.endTime,
        break_frequency_hours: normalizedDuration.hours,
        break_frequency_minutes_part: normalizedDuration.minutes,
        break_frequency_minutes: normalizedDuration.totalMinutes,
        auto_start_work_timer: Boolean(draft.autoStartWorkTimer),
        lunch_start: draft.lunchPauseEnabled ? draft.lunchStart : null,
        lunch_end: draft.lunchPauseEnabled ? draft.lunchEnd : null,
    };
}

export function buildWorkHoursPayload(userId, draft) {
    return {
        user_id: userId,
        ...buildWorkHoursFields(draft),
    };
}

export function buildSignupNotificationPayload(userId, checkinNotificationsOn) {
    return {
        user_id: userId,
        checkin_notifications_on: Boolean(checkinNotificationsOn),
    };
}

export function buildSignupWorkHoursPayload(userId, draft) {
    const normalizedDuration = normalizeDuration(draft.breakHours, draft.breakMinutes);

    return {
        user_id: userId,
        checkin_frequentie: normalizedDuration.totalMinutes,
        werk_startuur: draft.startTime,
        werk_einduur: draft.endTime,
        middag_startuur: draft.lunchPauseEnabled ? draft.lunchStart : null,
        middag_einduur: draft.lunchPauseEnabled ? draft.lunchEnd : null,
        mon_isworkday: Boolean(draft.selectedWorkdays?.mon),
        tue_isworkday: Boolean(draft.selectedWorkdays?.tue),
        wed_isworkday: Boolean(draft.selectedWorkdays?.wed),
        thu_isworkday: Boolean(draft.selectedWorkdays?.thu),
        fri_isworkday: Boolean(draft.selectedWorkdays?.fri),
        sat_isworkday: Boolean(draft.selectedWorkdays?.sat),
        sun_isworkday: Boolean(draft.selectedWorkdays?.sun),
    };
}

export function draftFromWorkHoursRow(row) {
    if (!row) {
        return createDefaultWorkHoursDraft();
    }

    const selectedWorkdays = createDefaultWorkdaySelection();

    (Array.isArray(row.workdays) ? row.workdays : []).forEach((dayKey) => {
        if (Object.prototype.hasOwnProperty.call(selectedWorkdays, dayKey)) {
            selectedWorkdays[dayKey] = true;
        }
    });

    const totalMinutes = Number(row.break_frequency_minutes);
    const hasTotalMinutes = Number.isFinite(totalMinutes) && totalMinutes >= 0;
    const hours = hasTotalMinutes ? Math.floor(totalMinutes / 60) : parseIntegerValue(row.break_frequency_hours);
    const minutes = hasTotalMinutes ? totalMinutes % 60 : parseIntegerValue(row.break_frequency_minutes_part);

    return {
        selectedWorkdays,
        breakHours: hours,
        breakMinutes: minutes,
        startTime: row.start_time || "09:00",
        endTime: row.end_time || "17:00",
        autoStartWorkTimer: row.auto_start_work_timer ?? true,
        lunchPauseEnabled: Boolean(row.lunch_start || row.lunch_end),
        lunchStart: row.lunch_start || "12:00",
        lunchEnd: row.lunch_end || "13:00",
    };
}
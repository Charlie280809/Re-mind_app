const dateOptions = { day: "numeric", month: "long", year: "numeric" };
const timeOptions = { hour: "2-digit", minute: "2-digit" };

export const formatDate = (date = new Date()) => new Intl.DateTimeFormat("nl-BE", dateOptions).format(date);

export const formatDateTime = (date = new Date()) =>
    `${new Intl.DateTimeFormat("nl-BE", dateOptions).format(date)} - ${new Intl.DateTimeFormat("nl-BE", timeOptions).format(date)}`;

//Andere voorstelling dagrapport
const dateOptions = { day: "numeric", month: "long", year: "numeric" };
const timeOptions = { hour: "2-digit", minute: "2-digit" };

export const formatDate = (date = new Date()) =>
    new Intl.DateTimeFormat("nl-BE", dateOptions).format(date);

export const formatDateTime = (date = new Date()) => {
    const formattedDate = new Intl.DateTimeFormat("nl-BE", dateOptions).format(date);
    const formattedTime = new Intl.DateTimeFormat("nl-BE", timeOptions).format(date);
    return `${formattedDate} - ${formattedTime}`;
};


// voor weekrapport
export const getStartOfWeek = (date = new Date()) => {
    const d = new Date(date);
    const diff = (d.getDay() + 6) % 7; // verschuif zodat maandag = 0
    d.setDate(d.getDate() - diff);
    d.setHours(0, 0, 0, 0);
    return d;
};

export const getEndOfWeek = (startDate) => {
    const d = new Date(startDate);
    d.setDate(d.getDate() + 6);
    d.setHours(23, 59, 59, 999);
    return d;
};

const monthName = (date, locale = "nl-BE") =>
    new Intl.DateTimeFormat(locale, { month: "long" }).format(date);

export function formatWeekRange(startDate, endDate, locale = "nl-BE") {
    const s = new Date(startDate);
    const e = new Date(endDate);

    const sameYear = s.getFullYear() === e.getFullYear();
    const sameMonth = sameYear && s.getMonth() === e.getMonth();

    if (sameMonth) {
        // 19 - 25 januari [optioneel jaar]
        return `${s.getDate()} - ${e.getDate()} ${monthName(s, locale)}${!sameYear ? ' ' + e.getFullYear() : ''}`;
    }

    if (sameYear) {
        // 30 jan - 2 feb
        const fmt = (d) => `${d.getDate()} ${monthName(d, locale).slice(0, 3)}`;
        const suffixYear = s.getFullYear() !== new Date().getFullYear() ? ' ' + s.getFullYear() : '';
        return `${fmt(s)} - ${fmt(e)}${suffixYear}`;
    }

    // verschil in jaren: 30 dec 2025 - 5 jan 2026
    const fmtFull = (d) => `${d.getDate()} ${monthName(d, locale)} ${d.getFullYear()}`;
    return `${fmtFull(s)} - ${fmtFull(e)}`;
}
const dateOptions = { day: "numeric", month: "long", year: "numeric" };
const timeOptions = { hour: "2-digit", minute: "2-digit" };

function isValidDate(date) {
    return date instanceof Date && !Number.isNaN(date.getTime());
}

function formatDayParts(date, locale = "nl-BE", includeYear = true) {
    const options = { day: "numeric", month: "long" };

    if (includeYear) {
        options.year = "numeric";
    }

    return new Intl.DateTimeFormat(locale, options).format(date);
}

export const formatDate = (date = new Date()) => new Intl.DateTimeFormat("nl-BE", dateOptions).format(date);

export const formatReportDate = (date = new Date(), locale = "nl-BE") => {
    const safeDate = new Date(date);

    if (!isValidDate(safeDate)) {
        return "";
    }

    const includeYear = safeDate.getFullYear() !== new Date().getFullYear();
    return formatDayParts(safeDate, locale, includeYear);
};

export const formatDateTime = (date = new Date()) =>
    `${new Intl.DateTimeFormat("nl-BE", dateOptions).format(date)} - ${new Intl.DateTimeFormat("nl-BE", timeOptions).format(date)}`;

export const getStartOfWeek = (date = new Date()) => {
    const d = new Date(date);
    const diff = (d.getDay() + 6) % 7;
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

const monthName = (date, locale = "nl-BE") => new Intl.DateTimeFormat(locale, { month: "long" }).format(date);

export function formatWeekRange(startDate, endDate, locale = "nl-BE") {
    const s = new Date(startDate);
    const e = new Date(endDate);

    if (!isValidDate(s) || !isValidDate(e)) {
        return "";
    }

    const sameYear = s.getFullYear() === e.getFullYear();
    const sameMonth = sameYear && s.getMonth() === e.getMonth();

    if (sameMonth) {
        return `${s.getDate()} tot ${e.getDate()} ${monthName(s, locale)}`;
    }

    if (sameYear) {
        return `${s.getDate()} ${monthName(s, locale)} tot ${e.getDate()} ${monthName(e, locale)}`;
    }

    return `${s.getDate()} ${monthName(s, locale)} ${s.getFullYear()} tot ${e.getDate()} ${monthName(e, locale)} ${e.getFullYear()}`;
}
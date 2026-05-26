import { supabase } from "../lib/supabaseClient";

export async function submitCheckIn(stress, energy) {
    if (!supabase) {
        throw new Error("Supabase is niet geconfigureerd.");
    }

    const { error } = await supabase.from("checkins").insert({
        stress: parseInt(stress, 10),
        energy: parseInt(energy, 10),
        need_pause: parseInt(stress, 10) >= 4 || parseInt(energy, 10) <= 2,
    });

    if (error) {
        throw new Error(error.message || "Kon check-in niet opslaan.");
    }

    return true;
}
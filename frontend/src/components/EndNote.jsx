import { useEffect } from "react";
import { LuX } from "react-icons/lu";
import endNoteIcon from "../assets/icons/Afsluitnotitie_normal.svg";
import "../css/EndNote.css";

export default function EndNote({
	isOpen,
	mode = "edit",
	value,
	onChange,
	onClose,
	onSubmit,
	isSaving,
	error,
}) {
	useEffect(() => {
		if (!isOpen) {
			return undefined;
		}

		const handleKeyDown = (event) => {
			if (event.key === "Escape") {
				onClose();
			}
		};

		document.body.classList.add("modalOpen");
		document.addEventListener("keydown", handleKeyDown);

		return () => {
			document.body.classList.remove("modalOpen");
			document.removeEventListener("keydown", handleKeyDown);
		};
	}, [isOpen, onClose]);

	if (!isOpen) {
		return null;
	}

	const isReadOnly = mode === "view";
	const handleSubmit = (event) => {
		event.preventDefault();
		onSubmit();
	};
	const displayValue = typeof value === "string" ? value.trim() : "";
	const noteText = displayValue || "Er is geen afsluitnotitie van de vorige dag.";

	return (
		<div className="endNoteOverlay" role="presentation" onClick={onClose}>
			<div
				className={`endNoteModal ${isReadOnly ? "endNoteModal--view" : ""}`}
				role="dialog"
				aria-modal="true"
				aria-labelledby="end-note-title"
				aria-describedby="end-note-description"
				onClick={(event) => event.stopPropagation()}
			>
				<button className="endNoteCloseButton" type="button" onClick={onClose} aria-label="Sluiten">
					<LuX />
				</button>

				<header className="endNoteHeader">
					<h2 id="end-note-title" className="endNoteTitle">
						{isReadOnly ? "Afsluitnotitie van voorgaande dag" : "Werkdag afgerond!"}
						{!isReadOnly ? (
							<>
								<br />
								Waar wil je morgen zeker nog aan werken?
							</>
						) : null}
					</h2>
					<p id="end-note-description" className="endNoteSubtitle">
						{isReadOnly
							? "De notitie van de vorige dag staat hieronder."
							: "Deze notitie zal morgen zichtbaar zijn zodat je je kan focussen op de doelen die je hier schrijft."}
						{!isReadOnly ? (
							<>
								<br />
								(<img src={endNoteIcon} alt="" className="endNoteIcon" /> Bij dit icoontje, rechtsbovenaan op de homepagina, kan je deze notitie terugvinden.)
							</>
						) : null}
					</p>
				</header>

				{isReadOnly ? (
					<div className="endNoteViewer">
						<blockquote className="endNoteViewerQuote">“{noteText}”</blockquote>
						<label className="endNoteViewerFooter">
							<input className="endNoteViewerCheckbox" type="checkbox" />
							<span>Markeren als voltooid</span>
						</label>
					</div>
				) : (
					<form className="endNoteForm" onSubmit={handleSubmit}>
						<textarea
							className="endNoteTextarea"
							value={value}
							onChange={(event) => onChange(event.target.value)}
							placeholder="Waarop wil je morgen focussen?"
							disabled={isSaving}
							autoFocus
						/>

						{error ? <p className="endNoteError">{error}</p> : null}

						<div className="endNoteActions">
							<button className="endNotePrimaryButton" type="submit" disabled={isSaving}>
								{isSaving ? "Opslaan..." : "Klaar"}
							</button>
						</div>
					</form>
				)}
			</div>
		</div>
	);
}


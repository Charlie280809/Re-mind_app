import { useEffect } from "react";
import { LuX } from "react-icons/lu";
import endNoteIcon from "../assets/icons/Afsluitnotitie_normal.svg";
import "../css/EndNote.css";

export default function EndNote({ isOpen, value, onChange, onClose, onSubmit, isSaving, error }) {
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

	const handleSubmit = (event) => {
		event.preventDefault();
		onSubmit();
	};

	return (
		<div className="endNoteOverlay" role="presentation" onClick={onClose}>
			<div
				className="endNoteModal"
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
						Werkdag afgerond!
                        <br />
                        Waar wil je morgen zeker nog aan werken?
					</h2>
					<p id="end-note-description" className="endNoteSubtitle">
						Deze notitie zal morgen zichtbaar zijn zodat je je kan focussen op de doelen die je hier schrijft.
                        <br />
                        (<img src={endNoteIcon} alt="" className="endNoteIcon" /> Bij dit icoontje, linksbovenaan op de homepagina, kan je deze notitie terugvinden.)
					</p>
                    <small></small>
				</header>

				<form className="endNoteForm" onSubmit={handleSubmit}>
					<textarea
						className="endNoteTextarea"
						value={value}
						onChange={(event) => onChange(event.target.value)}
						placeholder="Waarop wil je morgen focussen?"
						disabled={isSaving}
						// rows={8}
						autoFocus
					/>

					{error ? <p className="endNoteError">{error}</p> : null}

					<div className="endNoteActions">
						<button className="endNotePrimaryButton" type="submit" disabled={isSaving}>
							{isSaving ? "Opslaan..." : "Klaar"}
						</button>
					</div>
				</form>
			</div>
		</div>
	);
}


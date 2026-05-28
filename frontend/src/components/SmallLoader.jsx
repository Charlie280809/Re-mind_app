import spinner from "../assets/images/loadingSpinner.svg";
import "../css/SmallLoader.css";

export default function SmallLoader({ message = "Bezig met laden..." }) {
    return (
        <div className="smallLoader" role="status" aria-live="polite" aria-busy="true">
            <span className="smallLoaderMessage">{message}</span>
            <img className="smallLoaderSpinner" src={spinner} alt="" aria-hidden="true" />
        </div>
    );
}
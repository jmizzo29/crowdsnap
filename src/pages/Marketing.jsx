import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { APP_NAME, PAYMENT_LINK } from "../lib/config.js";
import { normalizeCode } from "../lib/codes.js";
import { listSeenGroups } from "../lib/localStore.js";

export default function Marketing() {
  const navigate = useNavigate();
  const [code, setCode] = useState("");
  const [seen, setSeen] = useState([]);

  useEffect(() => {
    listSeenGroups().then(setSeen);
  }, []);

  function join(event) {
    event.preventDefault();
    const next = normalizeCode(code);
    if (next.length >= 4) navigate(`/g/${next.toLowerCase()}`);
  }

  return (
    <div className="page">
      <header className="hero">
        <div className="topbar">
          <span className="wordmark">{APP_NAME}</span>
          <a className="btn-ghost" href={PAYMENT_LINK}>
            Buy · $49
          </a>
        </div>
        <div className="hero-split wrap">
          <div className="hero-body">
            <h1 className="display display-xl">Share the QR. Or put it on a table. The wall fills up.</h1>
            <p className="lede">Guests scan. They add a photo. It hits the wall.</p>
            <div className="hero-actions">
              <a className="btn" href={PAYMENT_LINK}>
                Make a group · $49
              </a>
              <a className="btn-ghost" href="#how">
                How it works
              </a>
            </div>
          </div>
          <figure className="hero-frame">
            <img src="/images/hero-youth.jpg" alt="Teens at a youth group night in a church rec room" />
          </figure>
        </div>
      </header>

      <main>
        <section className="section" id="how">
          <div className="wrap">
            <p className="kicker">Three steps</p>
            <div className="steps">
              <article className="step">
                <span className="step-num">01</span>
                <h3>Name the event</h3>
                <p>A title, a date or a weekend, a line on the card if you want one. That is the whole setup.</p>
              </article>
              <article className="step">
                <span className="step-num">02</span>
                <h3>Put the QR where people stand</h3>
                <p>A table. A door. A phone leaning on a glass. The stand view is built for a TV.</p>
              </article>
              <article className="step">
                <span className="step-num">03</span>
                <h3>The room fills the wall</h3>
                <p>Photos and short videos land in one private album. No app store. No chase-the-chat later.</p>
              </article>
            </div>
          </div>
        </section>

        <section className="section">
          <div className="wrap who">
            <div>
              <p className="kicker">Who it is for</p>
              <h2 className="section-title">Any private gathering that should stay in the room.</h2>
              <ul className="who-list">
                <li>A youth group night in the rec room.</li>
                <li>A lock-in, a game night, a cookout on the lawn.</li>
                <li>A retreat, a send-off, a Sunday after.</li>
                <li>A graduation in a yard.</li>
                <li>A wedding supper, or the lunch after.</li>
              </ul>
            </div>
            <div className="stills">
              <img className="tall" src="/images/still-youth-games.jpg" alt="Teens playing a giant block game at youth group" />
              <img className="wide" src="/images/still-youth-outdoor.jpg" alt="Outdoor church youth night with lawn games" />
              <img className="wide" src="/images/still-youth-hangout.jpg" alt="Youth group hangout in a rec room" />
            </div>
          </div>
        </section>

        <section className="section">
          <div className="wrap">
            <p className="kicker">The door</p>
            <h2 className="section-title">No accounts. No public feed. The QR is the invite.</h2>
            <div className="prose">
              <p>
                Knowing the group id is the only way in. There is no directory of events, no email list, no login wall for guests. If someone does not have the code from the host, they see nothing useful.
              </p>
            </div>
          </div>
        </section>

        <section className="section" id="buy">
          <div className="wrap">
            <p className="kicker">One time</p>
            <div className="buy-block">
              <h2 className="section-title">$49. One event.</h2>
              <p className="prose">
                Pay once for the event. Guests never pay. Not a subscription.
              </p>
              <a className="btn" href={PAYMENT_LINK}>
                Buy · $49
              </a>
              <p className="fine">After you pay, you name the event and get your code.</p>
            </div>
          </div>
        </section>

        <section className="section" id="new">
          <div className="wrap">
            <div>
              <p className="kicker">I have a code</p>
              <h2 className="section-title">Open a group you were handed.</h2>
              <form className="code-entry" onSubmit={join}>
                <input
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="CALM"
                  autoCapitalize="characters"
                  autoCorrect="off"
                />
                <button className="btn-line" type="submit">
                  Open
                </button>
              </form>
              {seen.length > 0 ? (
                <p className="seen">
                  On this phone:{" "}
                  {seen.map((row) => (
                    <Link key={row.code} to={`/g/${row.code.toLowerCase()}`}>
                      {row.name}
                    </Link>
                  ))}
                </p>
              ) : null}
            </div>
          </div>
        </section>
      </main>

      <footer className="wrap site-foot">
        <span>{APP_NAME}</span>
        <span>The wall is this machine</span>
      </footer>
    </div>
  );
}

import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  ArrowRight,
  Bell,
  Check,
  CheckCircle2,
  ChevronRight,
  CircleHelp,
  Clock3,
  Cloud,
  Coffee,
  Database,
  Gauge,
  Leaf,
  MapPin,
  Menu,
  MessageSquareText,
  Pause,
  Play,
  Radio,
  RefreshCw,
  Send,
  Settings2,
  ShieldCheck,
  Sparkles,
  Truck,
  UserRound,
  UsersRound,
  X,
  Zap,
} from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";

type Role = "farmer" | "operator" | "admin";

const roleCopy: Record<Role, { label: string; eyebrow: string }> = {
  farmer: { label: "Farmer portal", eyebrow: "Your procurement day, in view" },
  operator: { label: "Operator desk", eyebrow: "Centre control room" },
  admin: { label: "Admin operations", eyebrow: "System health & configuration" },
};

const statusStyle: Record<string, string> = {
  BOOKED: "status-neutral",
  ARRIVED: "status-blue",
  PROCESSING: "status-amber",
  QC_PASSED: "status-green",
  WEIGHED: "status-green",
  COMPLETED: "status-green",
  DELAYED: "status-amber",
};

function fmtEta(value?: string) {
  if (!value) return "—";
  return new Date(value).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("en-IN").format(value);
}

export default function Home() {
  const [role, setRole] = useState<Role>("farmer");
  const [mobileNav, setMobileNav] = useState(false);
  const [selectedBookingId, setSelectedBookingId] = useState("booking-a104");
  const [showBooking, setShowBooking] = useState(false);
  const [showDelay, setShowDelay] = useState(false);
  const [selectedCentreId, setSelectedCentreId] = useState("centre-a");
  const [crop, setCrop] = useState("Paddy");
  const [quantity, setQuantity] = useState(50);
  const [slot, setSlot] = useState("10:30 AM");
  const [delayMinutes, setDelayMinutes] = useState(20);
  const [delayReason, setDelayReason] = useState("Weighment lane maintenance");
  const [lastSync, setLastSync] = useState("Just now");

  const snapshotQuery = trpc.kisan.snapshot.useQuery(undefined, { refetchInterval: 20_000 });
  const utils = trpc.useUtils();
  const quoteQuery = trpc.kisan.quote.useQuery(
    { crop: crop as "Paddy" | "Wheat" | "Maize", quantity, centreId: selectedCentreId },
    { enabled: showBooking && quantity > 0 },
  );
  const createBooking = trpc.kisan.createBooking.useMutation({
    onSuccess: (booking) => {
      setSelectedBookingId(booking.id);
      setShowBooking(false);
      void utils.kisan.snapshot.invalidate();
      toast.success(`Token ${booking.token} confirmed`, { description: "Your live ETA is now being monitored." });
    },
    onError: (error) => toast.error("Booking could not be created", { description: error.message }),
  });
  const updateStatus = trpc.kisan.updateStatus.useMutation({
    onSuccess: (booking) => {
      void utils.kisan.snapshot.invalidate();
      toast.success(`${booking.token} moved to ${booking.stage}`);
    },
    onError: (error) => toast.error("Action not completed", { description: error.message }),
  });
  const recordWeighment = trpc.kisan.weighment.useMutation({
    onSuccess: (booking) => {
      void utils.kisan.snapshot.invalidate();
      toast.success(`Weighment saved for ${booking.token}`, { description: `Net weight: ${booking.weighment?.net} qtl` });
    },
    onError: (error) => toast.error("Weighment not saved", { description: error.message }),
  });
  const reportDelay = trpc.kisan.delay.useMutation({
    onSuccess: (result) => {
      setShowDelay(false);
      void utils.kisan.snapshot.invalidate();
      toast.success("Queue rebalanced", { description: `${result.affectedBookings.length} ETAs recalculated and farmer alerts queued.` });
    },
    onError: (error) => toast.error("Delay not reported", { description: error.message }),
  });
  const resetDemo = trpc.kisan.resetDemo.useMutation({
    onSuccess: () => {
      void utils.kisan.snapshot.invalidate();
      toast.success("Demo reset", { description: "The SIH baseline scenario is ready." });
    },
  });

  const snapshot = snapshotQuery.data;
  const selectedBooking = useMemo(() => snapshot?.bookings.find((booking) => booking.id === selectedBookingId) ?? snapshot?.bookings[0], [snapshot, selectedBookingId]);
  const selectedCentre = useMemo(() => snapshot?.centres.find((centre) => centre.id === selectedCentreId) ?? snapshot?.centres[0], [snapshot, selectedCentreId]);
  const selectedQuote = quoteQuery.data;

  useEffect(() => {
    if (!snapshotQuery.isFetching) setLastSync("Just now");
  }, [snapshotQuery.isFetching, snapshotQuery.dataUpdatedAt]);

  const refresh = () => {
    void snapshotQuery.refetch();
    setLastSync("Just now");
  };

  const navigateRole = (nextRole: Role) => {
    setRole(nextRole);
    setMobileNav(false);
  };

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand-lockup">
          <div className="brand-mark"><Leaf size={19} strokeWidth={2.5} /></div>
          <div>
            <div className="brand-name">Kisan<span>Setu</span></div>
            <div className="brand-subtitle">procurement intelligence</div>
          </div>
        </div>
        <div className="topbar-context">
          <span className="live-dot" />
          <span>Live operations</span>
          <span className="topbar-divider" />
          <span className="muted">Nandgaon district</span>
        </div>
        <div className="topbar-actions">
          <button className="icon-button desktop-only" aria-label="Help"><CircleHelp size={18} /></button>
          <button className="icon-button desktop-only" aria-label="Notifications"><Bell size={18} /><span className="notification-dot" /></button>
          <button className="avatar-chip"><span className="avatar">RK</span><span className="desktop-only">Ramesh Kumar</span><ChevronRight size={15} className="desktop-only" /></button>
          <button className="icon-button mobile-only" onClick={() => setMobileNav(!mobileNav)} aria-label="Menu"><Menu size={20} /></button>
        </div>
      </header>

      <div className="workspace">
        <aside className={`sidebar ${mobileNav ? "sidebar-open" : ""}`}>
          <div className="sidebar-context">
            <div className="context-label">WORKSPACE</div>
            <div className="role-switcher">
              {(Object.keys(roleCopy) as Role[]).map((item) => (
                <button key={item} className={`role-option ${role === item ? "role-active" : ""}`} onClick={() => navigateRole(item)}>
                  <span className={`role-icon role-${item}`}>
                    {item === "farmer" ? <UserRound size={15} /> : item === "operator" ? <Gauge size={15} /> : <Settings2 size={15} />}
                  </span>
                  <span>{roleCopy[item].label}</span>
                  {role === item && <span className="selected-bar" />}
                </button>
              ))}
            </div>
          </div>
          <div className="sidebar-section">
            <div className="context-label">{role === "farmer" ? "MY JOURNEY" : role === "operator" ? "CENTRE CONTROL" : "OVERVIEW"}</div>
            {role === "farmer" ? (
              <>
                <button className="side-link side-link-active"><Activity size={16} /> Overview</button>
                <button className="side-link" onClick={() => setShowBooking(true)}><Truck size={16} /> Book procurement <span className="side-plus">+</span></button>
                <button className="side-link"><Clock3 size={16} /> Booking history</button>
                <button className="side-link"><Bell size={16} /> Notifications <span className="side-count">3</span></button>
              </>
            ) : role === "operator" ? (
              <>
                <button className="side-link side-link-active"><Gauge size={16} /> Live queue</button>
                <button className="side-link"><Truck size={16} /> Today’s bookings <span className="side-count">{snapshot?.bookings.length ?? 0}</span></button>
                <button className="side-link"><Radio size={16} /> Centre status</button>
                <button className="side-link"><Activity size={16} /> Event log</button>
              </>
            ) : (
              <>
                <button className="side-link side-link-active"><Activity size={16} /> Operations overview</button>
                <button className="side-link"><Database size={16} /> Centres & capacity</button>
                <button className="side-link"><Sparkles size={16} /> Model health</button>
                <button className="side-link"><ShieldCheck size={16} /> Audit log</button>
              </>
            )}
          </div>
          <div className="sidebar-bottom">
            <div className="help-card">
              <div className="help-icon"><MessageSquareText size={17} /></div>
              <div><strong>Need help?</strong><span>Talk to support</span></div>
              <ArrowRight size={15} />
            </div>
            <div className="sync-note"><span className="sync-pulse" /> Last synced {lastSync}</div>
          </div>
        </aside>
        {mobileNav && <button className="sidebar-backdrop mobile-only" onClick={() => setMobileNav(false)} aria-label="Close menu" />}

        <main className="main-content">
          <div className="page-heading">
            <div>
              <div className="eyebrow">{roleCopy[role].eyebrow}</div>
              <h1>{role === "farmer" ? "Good morning, Ramesh" : role === "operator" ? "Nandgaon centre" : "System overview"}</h1>
              <p>{role === "farmer" ? "Your crop procurement plan is moving smoothly today." : role === "operator" ? "Tuesday, 25 September 2026 · Shift 01" : "A calm view of the network, queue health, and model readiness."}</p>
            </div>
            <div className="heading-actions">
              <div className="date-pill"><Clock3 size={15} /> Tue, 25 Sep 2026</div>
              <button className="refresh-button" onClick={refresh}><RefreshCw size={15} className={snapshotQuery.isFetching ? "spin" : ""} /> Refresh</button>
            </div>
          </div>

          {role === "farmer" && <FarmerView snapshot={snapshot} selectedBooking={selectedBooking} notifications={snapshot?.notifications ?? []} onBook={() => setShowBooking(true)} onSelectBooking={setSelectedBookingId} />}
          {role === "operator" && <OperatorView snapshot={snapshot} onDelay={() => setShowDelay(true)} onAction={(bookingId, status) => updateStatus.mutate({ bookingId, status })} onWeighment={(bookingId) => recordWeighment.mutate({ bookingId, gross: 55.4, tare: 5.4 })} />}
          {role === "admin" && <AdminView snapshot={snapshot} onReset={() => resetDemo.mutate()} />}

          <footer className="page-footer">
            <div><Leaf size={14} /> KisanSetu <span>·</span> Intelligent coordination layer</div>
            <div className="footer-right"><span className="security-lock"><ShieldCheck size={13} /> Secure workspace</span><span>v0.9 prototype</span></div>
          </footer>
        </main>
      </div>

      {showBooking && <BookingModal centres={snapshot?.centres ?? []} selectedCentreId={selectedCentreId} setSelectedCentreId={setSelectedCentreId} crop={crop} setCrop={setCrop} quantity={quantity} setQuantity={setQuantity} slot={slot} setSlot={setSlot} quote={selectedQuote} onClose={() => setShowBooking(false)} onSubmit={() => createBooking.mutate({ crop: crop as "Paddy" | "Wheat" | "Maize", quantity, centreId: selectedCentreId, slot })} submitting={createBooking.isPending} />}
      {showDelay && <DelayModal centre={selectedCentre} minutes={delayMinutes} setMinutes={setDelayMinutes} reason={delayReason} setReason={setDelayReason} onClose={() => setShowDelay(false)} onSubmit={() => reportDelay.mutate({ centreId: selectedCentre?.id ?? "centre-a", minutes: delayMinutes, reason: delayReason })} submitting={reportDelay.isPending} />}
    </div>
  );
}

function MetricCard({ label, value, detail, icon, accent = "green" }: { label: string; value: string; detail: string; icon: React.ReactNode; accent?: string }) {
  return <div className={`metric-card metric-${accent}`}><div className="metric-top"><span>{label}</span><span className="metric-icon">{icon}</span></div><div className="metric-value">{value}</div><div className="metric-detail">{detail}</div></div>;
}

function FarmerView({ snapshot, selectedBooking, notifications, onBook, onSelectBooking }: { snapshot: any; selectedBooking: any; notifications: any[]; onBook: () => void; onSelectBooking: (id: string) => void }) {
  return <>
    <div className="metric-grid farmer-metrics">
      <MetricCard label="My current ETA" value={fmtEta(selectedBooking?.eta)} detail={`${selectedBooking?.queuePosition ?? "—"}rd in queue · updated live`} icon={<Clock3 size={18} />} />
      <MetricCard label="Queue position" value={`#${selectedBooking?.queuePosition ?? "—"}`} detail={`${selectedBooking?.processingMinutes ?? 0} min estimated processing`} icon={<UsersRound size={18} />} accent="blue" />
      <MetricCard label="Centre status" value={selectedBooking?.centreName?.split(" ")[0] ?? "Active"} detail="Running normally · 74% capacity" icon={<Radio size={18} />} accent="amber" />
      <MetricCard label="Configured price" value={`₹${formatNumber(selectedBooking?.price ?? 2320)}`} detail="Current crop price · per quintal" icon={<Leaf size={18} />} accent="slate" />
    </div>

    <div className="content-grid farmer-grid">
      <section className="panel live-panel">
        <div className="panel-header"><div><div className="panel-kicker"><span className="live-dot" /> LIVE STATUS</div><h2>Today’s procurement journey</h2></div><button className="text-button" onClick={onBook}>New booking <ArrowRight size={15} /></button></div>
        {selectedBooking ? <>
          <div className="journey-banner"><div className="token-block"><span className="token-label">TOKEN</span><strong>{selectedBooking.token}</strong><span className="token-caption">{selectedBooking.quantity} qtl {selectedBooking.crop}</span></div><div className="journey-eta"><span>Expected arrival window</span><strong>{selectedBooking.slot}</strong><small><Clock3 size={13} /> ETA {fmtEta(selectedBooking.eta)} · {selectedBooking.delayMinutes ? `${selectedBooking.delayMinutes} min delay` : "on schedule"}</small></div><span className={`status-pill ${statusStyle[selectedBooking.status]}`}>{selectedBooking.status.replaceAll("_", " ")}</span></div>
          <div className="timeline">
            {[
              { label: "Gate Entry", caption: selectedBooking.status === "BOOKED" ? "Awaiting your arrival" : "Arrival recorded", done: selectedBooking.status !== "BOOKED", active: selectedBooking.status === "BOOKED" },
              { label: "Quality Check", caption: selectedBooking.qc.result === "PASSED" ? `${selectedBooking.qc.moisture}% moisture · passed` : "Centre team will check moisture", done: selectedBooking.qc.result === "PASSED", active: selectedBooking.stage === "Quality Check" },
              { label: "Weighment", caption: selectedBooking.weighment ? `Net ${selectedBooking.weighment.net} qtl` : "Manual gross & tare entry", done: Boolean(selectedBooking.weighment), active: selectedBooking.stage === "Weighment" },
              { label: "Payment", caption: selectedBooking.paymentStatus === "DBT_PROCESSING_INITIATED" ? "Reference state initiated" : "After weighment", done: selectedBooking.paymentStatus !== "NOT_STARTED", active: selectedBooking.stage === "Payment" },
            ].map((step, index) => <div className={`timeline-step ${step.done ? "step-done" : ""} ${step.active ? "step-active" : ""}`} key={step.label}><div className="step-line" /><div className="step-marker">{step.done ? <Check size={14} /> : <span>{index + 1}</span>}</div><div className="step-copy"><strong>{step.label}</strong><span>{step.caption}</span></div></div>)}
          </div>
          <div className="status-callout"><div className="callout-icon"><Zap size={17} /></div><div><strong>{selectedBooking.delayMinutes ? "Your ETA changed" : "You’re in the right place"}</strong><span>{selectedBooking.delayMinutes ? `The centre reported a ${selectedBooking.delayMinutes}-minute operational delay. Your portal updated automatically.` : "Keep an eye on this page. We’ll update your ETA if the centre conditions change."}</span></div><span className="websocket-chip"><span className="live-dot" /> Live sync</span></div>
        </> : <EmptyState message="No active procurement booking" action={onBook} />}
      </section>
      <section className="panel notifications-panel"><div className="panel-header"><div><div className="panel-kicker">UPDATES</div><h2>Recent notifications</h2></div><button className="icon-button"><ChevronRight size={16} /></button></div>{notifications.slice(0, 4).map((note: any) => <div className={`notification-row ${note.unread ? "notification-unread" : ""}`} key={note.id}><div className="notification-symbol"><Bell size={15} /></div><div className="notification-copy"><strong>{note.title}</strong><span>{note.body}</span><small>{note.channel} · {note.timestamp}</small></div>{note.unread && <span className="unread-dot" />}</div>)}<button className="panel-foot-link">View notification history <ArrowRight size={14} /></button></section>
    </div>

    <div className="content-grid secondary-grid"><section className="panel centres-panel"><div className="panel-header"><div><div className="panel-kicker">SMART RECOMMENDATIONS</div><h2>Nearby procurement centres</h2></div><span className="small-count">{snapshot?.centres?.length ?? 0} available</span></div>{(snapshot?.centres ?? []).map((centre: any, index: number) => <div className="centre-row" key={centre.id}><div className={`centre-rank ${index === 0 ? "rank-top" : ""}`}>0{index + 1}</div><div className="centre-main"><strong>{centre.name}</strong><span><MapPin size={13} /> {centre.location} <span className="dot-separator">·</span> {centre.operatingHours}</span></div><div className="centre-health"><span className={`health-dot ${centre.status === "ACTIVE" ? "health-green" : "health-amber"}`} />{centre.status === "ACTIVE" ? "Available" : "Delayed"}<small>{centre.waitMinutes} min wait</small></div><button className="row-arrow"><ChevronRight size={17} /></button></div>)}</section><section className="panel price-panel"><div className="panel-header"><div><div className="panel-kicker">PRICE REFERENCE</div><h2>Current crop prices</h2></div><span className="source-tag">Configured</span></div>{Object.entries({ Paddy: 2320, Wheat: 2275, Maize: 2090 }).map(([name, price], index) => <div className="price-row" key={name}><span className="crop-swatch">{name.charAt(0)}</span><div><strong>{name}</strong><span>per quintal · effective 25 Sep</span></div><b>₹{formatNumber(price)}</b><span className="price-trend">{index === 0 ? "Today" : "Active"}</span></div>)}<div className="disclaimer"><ShieldCheck size={14} /> Prices are configured references, not official MSP.</div></section></div>
    <section className="activity-strip"><div className="activity-label"><Activity size={16} /><span>Recent centre activity</span></div>{(snapshot?.activity ?? []).slice(0, 3).map((event: any) => <div className="activity-item" key={event.id}><span className={`event-dot event-${event.tone}`} /><div><strong>{event.message}</strong><small>{event.timestamp}</small></div></div>)}<button className="activity-more"><ArrowRight size={15} /></button></section>
  </>;
}

function OperatorView({ snapshot, onDelay, onAction, onWeighment }: { snapshot: any; onDelay: () => void; onAction: (id: string, status: "ARRIVED" | "PROCESSING" | "QC_PASSED" | "COMPLETED") => void; onWeighment: (id: string) => void }) {
  const centre = snapshot?.centres?.[0];
  const queue = (snapshot?.bookings ?? []).filter((booking: any) => booking.centreId === centre?.id);
  return <>
    <div className="metric-grid operator-metrics"><MetricCard label="Queue today" value={`${queue.length} farmers`} detail="4 arrived · 1 processing" icon={<UsersRound size={18} />} /><MetricCard label="Centre capacity" value={`${centre?.capacityPct ?? 0}%`} detail={`${centre?.dailyCapacity ?? 28} farmer target · today`} icon={<Gauge size={18} />} accent="blue" /><MetricCard label="Avg. processing" value="31 min" detail="6 min faster than baseline" icon={<Clock3 size={18} />} accent="green" /><MetricCard label="Centre status" value={centre?.status === "DELAYED" ? "Delayed" : "Running"} detail={centre?.status === "DELAYED" ? `${snapshot.delayMinutes} min impact active` : "No active bottlenecks"} icon={<Radio size={18} />} accent={centre?.status === "DELAYED" ? "amber" : "slate"} /></div>
    <div className="content-grid operator-grid"><section className="panel queue-panel"><div className="panel-header"><div><div className="panel-kicker"><span className="live-dot" /> LIVE QUEUE</div><h2>Today’s processing line</h2></div><div className="queue-header-actions"><span className="live-state"><span className="live-dot" /> Synced</span><button className="delay-button" onClick={onDelay}><Zap size={14} /> Report delay</button></div></div><div className="queue-table"><div className="queue-table-head"><span>Token</span><span>Farmer & lot</span><span>ETA</span><span>Status</span><span>Action</span></div>{queue.map((booking: any, index: number) => <div className={`queue-row ${booking.status === "PROCESSING" ? "queue-row-active" : ""}`} key={booking.id}><div className="queue-token"><strong>{booking.token}</strong><span>#{booking.queuePosition}</span></div><div className="queue-farmer"><strong>{booking.farmerName}</strong><span>{booking.crop} · {booking.quantity} qtl</span></div><div className="queue-eta"><strong>{fmtEta(booking.eta)}</strong><span>{booking.processingMinutes} min est.</span></div><div><span className={`status-pill ${statusStyle[booking.status]}`}>{booking.status === "PROCESSING" ? "In process" : booking.status.replaceAll("_", " ")}</span></div><div className="queue-actions">{booking.status === "BOOKED" && <button className="mini-action" onClick={() => onAction(booking.id, "ARRIVED")}>Arrived</button>}{booking.status === "ARRIVED" && <button className="mini-action mini-primary" onClick={() => onAction(booking.id, "PROCESSING")}><Play size={12} /> Start</button>}{booking.status === "PROCESSING" && <><button className="mini-action" onClick={() => onAction(booking.id, "QC_PASSED")}><Check size={12} /> QC pass</button><button className="mini-action mini-primary" onClick={() => onWeighment(booking.id)}>Weigh</button></>}{booking.status === "WEIGHED" && <button className="mini-action mini-primary" onClick={() => onAction(booking.id, "COMPLETED")}>Complete</button>}{booking.status === "QC_PASSED" && <button className="mini-action mini-primary" onClick={() => onWeighment(booking.id)}>Weigh</button>}</div></div>)}</div><div className="queue-foot"><span><span className="sync-pulse" /> Changes are pushed to farmers automatically</span><button className="text-button">Open full queue <ArrowRight size={14} /></button></div></section><section className="panel centre-control-panel"><div className="panel-header"><div><div className="panel-kicker">CENTRE CONTROL</div><h2>Operations state</h2></div><span className={`status-pill ${centre?.status === "DELAYED" ? "status-amber" : "status-green"}`}>{centre?.status === "DELAYED" ? "Delay active" : "Running normally"}</span></div><div className="control-status"><div className="big-status-icon"><Radio size={23} /></div><div><strong>{centre?.name}</strong><span>{centre?.operatingHours} · last updated just now</span></div></div><div className="capacity-meter"><div className="meter-label"><span>Capacity used</span><strong>{centre?.capacityPct ?? 0}%</strong></div><div className="meter-track"><span style={{ width: `${centre?.capacityPct ?? 0}%` }} /></div><div className="meter-foot"><span>{centre?.queueSize ?? 0} active farmers</span><span>{centre?.dailyCapacity ?? 0} daily target</span></div></div><div className="control-actions"><button className="control-action"><Pause size={15} /> Pause centre</button><button className="control-action"><Cloud size={15} /> View forecast</button></div><div className="operator-note"><div className="note-avatar">OP</div><p><strong>Keep farmers informed.</strong><br />Report operational changes as soon as they happen. KisanSetu recalculates every affected ETA.</p></div></section></div>
    <section className="activity-strip"><div className="activity-label"><Activity size={16} /><span>Operator event stream</span></div>{(snapshot?.activity ?? []).slice(0, 3).map((event: any) => <div className="activity-item" key={event.id}><span className={`event-dot event-${event.tone}`} /><div><strong>{event.message}</strong><small>{event.timestamp}</small></div></div>)}<button className="activity-more"><ArrowRight size={15} /></button></section>
  </>;
}

function AdminView({ snapshot, onReset }: { snapshot: any; onReset: () => void }) {
  return <><div className="metric-grid admin-metrics"><MetricCard label="Network queue" value={`${snapshot?.bookings?.length ?? 0} farmers`} detail="Across 2 active centres" icon={<UsersRound size={18} />} /><MetricCard label="Centres healthy" value="2 / 2" detail="No centre offline" icon={<ShieldCheck size={18} />} accent="green" /><MetricCard label="Prediction model" value="Healthy" detail="Random Forest · v0.3" icon={<Sparkles size={18} />} accent="blue" /><MetricCard label="Notifications" value="98.4%" detail="Mock delivery success" icon={<Send size={18} />} accent="slate" /></div><div className="content-grid admin-grid"><section className="panel model-panel"><div className="panel-header"><div><div className="panel-kicker">SYSTEM READINESS</div><h2>Coordination layer health</h2></div><span className="status-pill status-green"><CheckCircle2 size={14} /> All systems ready</span></div><div className="health-list"><HealthRow icon={<Database size={17} />} name="Permanent data layer" value="PostgreSQL source of truth" status="Ready" /><HealthRow icon={<Radio size={17} />} name="Live state projection" value="Redis · reconstructable" status="Ready" /><HealthRow icon={<Zap size={17} />} name="Queue engine" value="Deterministic scheduling" status="Ready" /><HealthRow icon={<Sparkles size={17} />} name="AI time prediction" value="Synthetic prototype dataset" status="Ready" /></div><div className="model-disclosure"><Sparkles size={16} /><div><strong>AI predicts. The engine decides.</strong><span>Processing durations inform scheduling; they never directly control booking.</span></div></div></section><section className="panel centres-admin"><div className="panel-header"><div><div className="panel-kicker">CONFIGURED CENTRES</div><h2>Centre network</h2></div><button className="text-button">Manage <ArrowRight size={14} /></button></div>{(snapshot?.centres ?? []).map((centre: any) => <div className="admin-centre-row" key={centre.id}><div className="admin-centre-icon"><MapPin size={16} /></div><div><strong>{centre.name}</strong><span>{centre.operatingHours} · {centre.location}</span></div><div className="admin-centre-health"><span className="health-dot health-green" /> {centre.capacityPct}% used</div><ChevronRight size={15} /></div>)}</section></div><section className="panel demo-panel"><div className="demo-panel-copy"><div className="demo-badge"><Sparkles size={14} /> SIH demonstration mode</div><h2>Make the dynamic feedback loop visible.</h2><p>Reset the shared demo state, then move to the operator desk to report a delay. Watch Ramesh’s live ETA update in the Farmer portal.</p></div><div className="demo-actions"><button className="secondary-button" onClick={onReset}><RefreshCw size={15} /> Reset baseline</button><div className="demo-flow"><span>BOOK</span><ArrowRight size={13} /><span>PLAN</span><ArrowRight size={13} /><span>ADAPT</span><ArrowRight size={13} /><span>TRACK</span></div></div></section></>;
}

function HealthRow({ icon, name, value, status }: { icon: React.ReactNode; name: string; value: string; status: string }) {
  return <div className="health-row"><div className="health-icon">{icon}</div><div><strong>{name}</strong><span>{value}</span></div><span className="health-ready"><Check size={13} /> {status}</span></div>;
}

function EmptyState({ message, action }: { message: string; action: () => void }) { return <div className="empty-state"><div className="empty-icon"><Truck size={22} /></div><strong>{message}</strong><span>Choose a centre and reserve a queue-aware slot.</span><button className="primary-button" onClick={action}>Book procurement <ArrowRight size={15} /></button></div>; }

function BookingModal({ centres, selectedCentreId, setSelectedCentreId, crop, setCrop, quantity, setQuantity, slot, setSlot, quote, onClose, onSubmit, submitting }: any) {
  return <div className="modal-backdrop"><div className="modal-card booking-modal"><div className="modal-header"><div><div className="panel-kicker">NEW PROCUREMENT BOOKING</div><h2>Plan your visit</h2><p>We’ll match your quantity to real centre capacity.</p></div><button className="icon-button" onClick={onClose}><X size={19} /></button></div><div className="booking-form"><div className="form-row"><label>Crop<select value={crop} onChange={(event) => setCrop(event.target.value)}><option>Paddy</option><option>Wheat</option><option>Maize</option></select></label><label>Expected quantity <span className="field-unit">quintals</span><input type="number" min="1" max="500" value={quantity} onChange={(event) => setQuantity(Number(event.target.value))} /></label></div><div className="form-section-label">Recommended centres</div><div className="modal-centres">{centres.map((centre: any, index: number) => <button className={`modal-centre ${centre.id === selectedCentreId ? "modal-centre-active" : ""}`} key={centre.id} onClick={() => setSelectedCentreId(centre.id)}><span className="radio-mark">{centre.id === selectedCentreId && <span />}</span><div><strong>{centre.name}</strong><span>{centre.location} · {centre.operatingHours}</span></div><div className="modal-centre-meta"><b>{centre.waitMinutes} min</b><span>expected wait</span></div></button>)}</div>{quote && <div className="quote-card"><div className="quote-head"><span className="quote-icon"><Sparkles size={15} /></span><div><strong>Queue-aware estimate</strong><span>Random Forest prediction + operational rules</span></div><span className="quote-price">₹{formatNumber(quote.price)}<small>/ qtl</small></span></div><div className="quote-stats"><div><span>Predicted processing</span><strong>{quote.predictedMinutes} min</strong></div><div><span>Centre load</span><strong>{quote.centre.capacityPct}%</strong></div><div><span>Available slots</span><strong>{quote.slots.filter((entry: any) => entry.available).length}</strong></div></div></div>}<div className="form-section-label">Choose an arrival window</div><div className="slot-grid">{(quote?.slots ?? []).map((entry: any) => <button className={`slot-option ${slot === entry.slot ? "slot-active" : ""} ${!entry.available ? "slot-unavailable" : ""}`} disabled={!entry.available} key={entry.slot} onClick={() => setSlot(entry.slot)}><strong>{entry.slot}</strong><span>ETA {fmtEta(entry.eta)}</span></button>)}</div><div className="modal-disclaimer"><ShieldCheck size={14} /> Current Crop Price is a configured reference. Official MSP and DBT remain outside this prototype.</div></div><div className="modal-footer"><button className="secondary-button" onClick={onClose}>Cancel</button><button className="primary-button" onClick={onSubmit} disabled={submitting || !quote}>{submitting ? "Confirming…" : "Confirm booking"}<ArrowRight size={15} /></button></div></div></div>;
}

function DelayModal({ centre, minutes, setMinutes, reason, setReason, onClose, onSubmit, submitting }: any) {
  return <div className="modal-backdrop"><div className="modal-card delay-modal"><div className="modal-header"><div><div className="panel-kicker">OPERATIONAL EVENT</div><h2>Report a centre delay</h2><p>This will recalculate every affected farmer ETA.</p></div><button className="icon-button" onClick={onClose}><X size={19} /></button></div><div className="delay-alert"><div className="delay-alert-icon"><Zap size={17} /></div><div><strong>Live propagation enabled</strong><span>PostgreSQL event → queue engine → Redis → WebSocket → farmer portal</span></div></div><label>Delay duration <span className="field-unit">minutes</span><input type="number" min="5" max="180" value={minutes} onChange={(event) => setMinutes(Number(event.target.value))} /></label><label>Reason<select value={reason} onChange={(event) => setReason(event.target.value)}><option>Weighment lane maintenance</option><option>Quality check re-inspection</option><option>Centre operational bottleneck</option><option>Unexpected arrival surge</option></select></label><div className="impact-preview"><span>Impact preview</span><strong>{centre?.queueSize ?? 0} active bookings</strong><small>will receive updated ETAs</small></div><div className="modal-footer"><button className="secondary-button" onClick={onClose}>Cancel</button><button className="primary-button button-amber" onClick={onSubmit} disabled={submitting}>{submitting ? "Publishing…" : "Publish delay"}<Send size={15} /></button></div></div></div>;
}

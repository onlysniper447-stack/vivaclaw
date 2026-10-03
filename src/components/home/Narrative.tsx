import type { ReactNode } from "react";

function Label({ children }: { children: string }) {
  return (
    <p className="flex items-center gap-3 font-mono text-[11px] font-medium tracking-[0.18em] text-[#FFB81C] uppercase">
      <span className="h-px w-5 bg-[#FFB81C]" aria-hidden />
      {children}
    </p>
  );
}

function Row({
  index,
  title,
  children,
  tag,
}: {
  index: string;
  title: string;
  children: ReactNode;
  tag: string;
}) {
  return (
    <article className="grid grid-cols-[2.25rem_minmax(0,1fr)] gap-x-5 border-t border-white/10 py-7 last:border-b lg:gap-x-7 lg:py-8">
      <span className="num pt-0.5 font-mono text-[11px] tracking-[0.14em] text-[#FFB81C]">{index}</span>
      <div>
        <h3 className="font-sans text-[18px] leading-snug font-semibold tracking-[-0.02em] text-[#F5F5F5] uppercase sm:text-[20px]">
          {title}
        </h3>
        <p className="mt-2.5 max-w-md font-sans text-[15px] leading-relaxed font-light text-[#9CA3AF]">{children}</p>
        <p className="mt-3 font-mono text-[10px] tracking-[0.16em] text-[#6B7280] uppercase">{tag}</p>
      </div>
    </article>
  );
}

function Stage({
  kicker,
  headline,
  body,
  children,
}: {
  kicker: string;
  headline: ReactNode;
  body: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="relative mx-auto grid max-w-[1240px] items-start gap-12 px-5 py-20 lg:grid-cols-[minmax(0,0.88fr)_minmax(0,1.12fr)] lg:gap-24 lg:py-28">
      <div className="lg:sticky lg:top-28 lg:self-start">
        <Label>{kicker}</Label>
        <h2 className="mt-8 max-w-md font-sans text-[22px] leading-[1.2] font-bold tracking-[-0.03em] text-[#F5F5F5] uppercase sm:text-[28px] lg:text-[34px]">
          {headline}
        </h2>
        <p className="mt-6 max-w-sm font-sans text-[16px] leading-relaxed font-light text-[#C4C8CE]">{body}</p>
      </div>
      <div>{children}</div>
    </div>
  );
}

export function Narrative() {
  return (
    <div className="relative overflow-hidden border-y border-white/[0.06] bg-[#070707]">
      <div
        className="pointer-events-none absolute inset-0 opacity-70"
        aria-hidden
        style={{
          backgroundImage:
            "linear-gradient(to right, rgba(255,255,255,0.035) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.035) 1px, transparent 1px)",
          backgroundSize: "56px 56px",
        }}
      />
      <div
        className="pointer-events-none absolute -top-24 left-[-8%] h-[28rem] w-[28rem] rounded-full bg-[#7FB2FF]/[0.07] blur-3xl"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute right-[-6%] bottom-[-12%] h-[26rem] w-[26rem] rounded-full bg-[#7FB2FF]/[0.05] blur-3xl"
        aria-hidden
      />

      <section id="problem" className="relative">
        <Stage
          kicker="The problem"
          headline={
            <>
              AI can find yield.
              <br />
              It can&apos;t always <span className="text-[#FFB81C]">act.</span>
            </>
          }
          body="DeFi creates thousands of yield opportunities, but finding them is only the first step. Agents need the ability to evaluate and act."
        >
          <Row index="01" title="Fragmented intelligence" tag="Problem: data fragmentation">
            Yield is scattered across protocols and markets. Agents should not have to assemble it first.
          </Row>
          <Row index="02" title="Opportunities move" tag="Problem: dynamic markets">
            Yield, liquidity, and conditions change. An opening can close before the agent is ready to act.
          </Row>
          <Row index="03" title="Signal isn&apos;t action" tag="Problem: execution gap">
            Finding an opportunity is not enough. The agent still has to evaluate it and act under constraints.
          </Row>
        </Stage>
      </section>

      <div className="relative mx-auto max-w-[1240px] px-5">
        <p className="border-y border-white/10 py-6 font-mono text-[10px] tracking-[0.18em] text-[#9CA3AF] uppercase">
          Discover <span className="text-[#FFB81C]">→</span> Evaluate{" "}
          <span className="text-[#FFB81C]">→</span> Act
        </p>
      </div>

      <section id="steps" className="relative">
        <Stage
          kicker="How Hettnet works"
          headline={
            <>
              From yield to <span className="text-[#FFB81C]">action.</span>
            </>
          }
          body="Hettnet helps AI agents discover opportunities, evaluate them, and act when the conditions are right."
        >
          <Row index="01" title="Discover opportunities" tag="01 · Discover">
            Monitor supported markets and identify relevant yield opportunities.
          </Row>
          <Row index="02" title="Evaluate the signal" tag="02 · Evaluate">
            Check strategy, market conditions, liquidity, costs, and requirements before acting.
          </Row>
          <Row index="03" title="Take action" tag="03 · Act">
            Execute when an opportunity meets the agent&apos;s requirements.
          </Row>
        </Stage>
      </section>
    </div>
  );
}

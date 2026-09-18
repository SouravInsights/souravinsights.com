import React from "react";
import { Document, Page, Text, View, Link, StyleSheet } from "@react-pdf/renderer";
import type { CVData } from "@/types/cv";

/**
 * Renders the CV to a PDF that mirrors the layout of the PDF in the local cv/ dir:
 * 612 x 936pt page, 36pt margins, Helvetica, #1153CC links, #666666 for dates and
 * locations. Content comes straight from the live CV data, so the download can
 * never drift from what the page shows.
 */

const ACCENT = "#1153CC";
const MUTED = "#666666";

const styles = StyleSheet.create({
  page: {
    paddingTop: 36,
    paddingBottom: 36,
    paddingLeft: 36,
    paddingRight: 36,
    fontFamily: "Helvetica",
    fontSize: 10,
    lineHeight: 1.28,
    color: "#000000",
  },
  name: {
    fontFamily: "Helvetica-Bold",
    fontSize: 20,
    textAlign: "center",
    marginBottom: 9,
  },
  contact: { fontSize: 11, textAlign: "center" },
  summary: { fontSize: 10.5, marginTop: 15 },
  section: {
    fontFamily: "Helvetica-Bold",
    fontSize: 14,
    marginTop: 19,
  },
  entry: { marginTop: 9 },
  entryHead: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
  },
  role: { fontFamily: "Helvetica-Bold", fontSize: 11 },
  dates: { fontSize: 10.5, color: MUTED },
  org: { fontSize: 11, marginTop: 1 },
  muted: { color: MUTED },
  link: { color: ACCENT, textDecoration: "underline" },
  bullets: { marginTop: 4 },
  bulletRow: { flexDirection: "row", paddingLeft: 18 },
  bulletText: { flex: 1, fontSize: 10 },
  subRow: { flexDirection: "row", paddingLeft: 36 },
  subText: { flex: 1, fontSize: 10 },
  skillRow: { flexDirection: "row", paddingLeft: 18, marginTop: 4 },
  markerBox: { width: 18, paddingTop: 4.5 },
  markerFilled: { width: 3.5, height: 3.5, borderRadius: 1.75, backgroundColor: "#000000" },
  markerHollow: {
    width: 3.5,
    height: 3.5,
    borderRadius: 1.75,
    borderWidth: 0.6,
    borderColor: "#000000",
  },
  skillBody: { flex: 1 },
  skillCategory: { fontFamily: "Helvetica-Bold", fontSize: 10.5 },
  skillItems: { fontSize: 10 },
});

/**
 * Bullet markers are drawn as rounded Views rather than text glyphs: Helvetica's
 * encoding has no filled or hollow circle, so the characters come out mangled in
 * the PDF. Two plain Views keep the ● and ○ look of the local CV exactly.
 */
function Marker({ hollow = false }: { hollow?: boolean }) {
  return (
    <View style={styles.markerBox}>
      <View style={hollow ? styles.markerHollow : styles.markerFilled} />
    </View>
  );
}

function Bullets({ items }: { items: string[] }) {
  return (
    <View style={styles.bullets}>
      {items.map((text, index) => (
        <View key={index} style={styles.bulletRow} wrap={false}>
          <Marker />
          <Text style={styles.bulletText}>{text}</Text>
        </View>
      ))}
    </View>
  );
}

function EntryHead({ role, dates }: { role: string; dates: string }) {
  return (
    <View style={styles.entryHead}>
      <Text style={styles.role}>{role}</Text>
      <Text style={styles.dates}>{dates}</Text>
    </View>
  );
}

export function CVDocument({ data }: { data: CVData }) {
  const { header } = data;

  const withProtocol = (value: string) => (value.startsWith("http") ? value : `https://${value}`);
  const website = withProtocol(header.website);
  const linkedin = withProtocol(header.linkedin);
  const twitter = withProtocol(header.twitter);

  return (
    <Document title="Sourav Kumar Nanda - CV" author={header.name}>
      <Page size={[612, 936]} style={styles.page}>
        <Text style={styles.name}>{header.name}</Text>
        <Text style={styles.contact}>
          {header.location} | {header.phone} | {header.email}
        </Text>
        <Text style={styles.contact}>
          <Link src={website} style={styles.link}>
            {header.website}
          </Link>
          {" | "}
          <Link src={linkedin} style={styles.link}>
            {header.linkedin}
          </Link>
          {" | "}
          <Link src={twitter} style={styles.link}>
            {header.twitter}
          </Link>
        </Text>

        <Text style={styles.summary}>{data.about}</Text>

        <Text style={styles.section}>EXPERIENCE &amp; PROJECTS</Text>

        {data.projects.map((project) => (
          // The name itself carries the primary link (projectUrl), the same
          // rule as the web page; links[] holds only extra destinations.
          <View key={project.id} style={styles.entry} wrap={false}>
            <EntryHead
              role={project.role}
              dates={`${project.startDate} - ${project.endDate}`}
            />
            <Text style={styles.org}>
              {project.projectUrl ? (
                <Link src={withProtocol(project.projectUrl)} style={styles.link}>
                  {project.name}
                </Link>
              ) : (
                project.name
              )}
              {(project.links ?? []).map((item) => (
                <Text key={item.url}>
                  {" | "}
                  <Link src={item.url} style={styles.link}>
                    {item.label}
                  </Link>
                </Text>
              ))}
            </Text>
            <Bullets items={project.bullets} />
          </View>
        ))}

        {data.workExperience.map((job) => (
          <View key={job.id} style={styles.entry} wrap={false}>
            <EntryHead role={job.role} dates={`${job.startDate} - ${job.endDate}`} />
            <Text style={styles.org}>
              {job.companyUrl ? (
                <Link src={job.companyUrl} style={styles.link}>
                  {job.company}
                </Link>
              ) : (
                job.company
              )}
              {job.location ? <Text style={styles.muted}>, {job.location}</Text> : null}
            </Text>
            <Bullets items={job.bullets} />
          </View>
        ))}

        <Text style={styles.section}>EDUCATION</Text>
        {data.education.map((edu) => (
          <View key={edu.id} style={styles.entry} wrap={false}>
            <EntryHead role={edu.degree} dates={`${edu.startDate} - ${edu.endDate}`} />
            <Text style={[styles.org, { fontStyle: "italic" }]}>
              {edu.institution}
              {edu.location ? `; ${edu.location}.` : ""}
            </Text>
          </View>
        ))}

        <Text style={styles.section}>SKILLS</Text>
        {data.skills.map((group) => (
          <View key={group.id} style={styles.skillRow} wrap={false}>
            <Marker />
            <View style={styles.skillBody}>
              {typeof group.items === "string" ? (
                <Text style={styles.skillItems}>
                  <Text style={styles.skillCategory}>{group.category}</Text>: {group.items}
                </Text>
              ) : (
                <>
                  <Text style={styles.skillCategory}>{group.category}</Text>
                  {group.items.map((item) => (
                    <View key={item} style={styles.subRow}>
                      <Marker hollow />
                      <Text style={styles.subText}>{item}</Text>
                    </View>
                  ))}
                </>
              )}
            </View>
          </View>
        ))}
      </Page>
    </Document>
  );
}

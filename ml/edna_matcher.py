"""
edna_matcher.py
eDNA sequence matching — NCBI BLAST (primary) + local fallback.
"""

import os, re, time
from Bio import Entrez, SeqIO
from Bio.Blast import NCBIWWW, NCBIXML
from Bio import pairwise2
from Bio.pairwise2 import format_alignment

# ── Local reference database ───────────────────────────────────────────────────
# 20 common Indian marine fish — short 16S/COI marker sequences (synthetic refs)
LOCAL_DB = {
    "Rastrelliger kanagurta": {
        "common_name":    "Indian Mackerel",
        "sequence":       "ATGCTTGTATTTGTACTAATCCTTGCAGTCATAGCTCATACTATGCTTATTCCAACTTGCCTTGCAATAGCACAT",
        "conservation":   "Least Concern",
        "description":    "Highly abundant coastal pelagic fish of the Indian Ocean.",
        "locations":      [[10.5, 76.2], [14.3, 74.1], [19.9, 72.8]],
    },
    "Sardinella longiceps": {
        "common_name":    "Indian Oil Sardine",
        "sequence":       "ATGCTACTTTTAATAATCCTGGCTGTAATAGCTCATACCATGCTAATCCCAACTTGCCTGGCAATAGCACATACA",
        "conservation":   "Least Concern",
        "description":    "Most abundant fish along the west coast of India.",
        "locations":      [[8.4, 77.1], [11.9, 75.3], [15.5, 73.8]],
    },
    "Tenualosa ilisha": {
        "common_name":    "Hilsa Shad",
        "sequence":       "ATGCTAGTATTTATTATAATCTTGGCTGTCATAGCTCACACTATAATAATCCCAACCTGCCTTGCGATAGCACACG",
        "conservation":   "Near Threatened",
        "description":    "Commercially important anadromous fish in Bay of Bengal.",
        "locations":      [[21.9, 89.5], [22.5, 88.3], [20.1, 86.7]],
    },
    "Thunnus albacares": {
        "common_name":    "Yellowfin Tuna",
        "sequence":       "ATGCTCGTATTTATCCTCATCCTGGCAGTCATAGCCCACACCATACTCATCCCAACCTGCCTGGCTATAGCACACC",
        "conservation":   "Near Threatened",
        "description":    "Highly migratory pelagic fish of the Indian Ocean.",
        "locations":      [[5.0, 73.0], [8.0, 78.5], [12.0, 80.0]],
    },
    "Pampus argenteus": {
        "common_name":    "Silver Pomfret",
        "sequence":       "ATGCTTGTATTTATAATAATTCTTGCAGTAATAGCCCACACAATGCTAATCCCAACCTGCCTTGCAATAGCACAC",
        "conservation":   "Near Threatened",
        "description":    "Prized food fish found across Indo-Pacific tropical waters.",
        "locations":      [[22.0, 69.5], [21.3, 70.1], [20.5, 72.3]],
    },
    "Epinephelus coioides": {
        "common_name":    "Orange-spotted Grouper",
        "sequence":       "ATGCTAGTCTTCATCATAATCCTTGCCGTAATAGCCCATACCATGCTGATCCCAACCTGCCTGGCAATAGCGCAC",
        "conservation":   "Vulnerable",
        "description":    "Reef-associated grouper species important for coral ecosystem health.",
        "locations":      [[10.8, 79.8], [8.9, 76.5], [12.5, 80.3]],
    },
    "Lutjanus campechanus": {
        "common_name":    "Red Snapper",
        "sequence":       "ATGCTCGTATTCATCATAATCCTGGCCGTGATAGCCCACACAATGCTAATCCCAACCTGCCTGGCGATAGCCCAC",
        "conservation":   "Vulnerable",
        "description":    "Reef fish found in tropical Indian Ocean waters.",
        "locations":      [[9.5, 78.2], [11.2, 79.5], [13.0, 80.8]],
    },
    "Scomberomorus commerson": {
        "common_name":    "Seer Fish / King Fish",
        "sequence":       "ATGCTTGTCTTCATAATCATCCTTGCCGTCATAGCCCATACCATACTAATCCCAACCTGCCTGGCGATAGCACAC",
        "conservation":   "Least Concern",
        "description":    "One of the most prized food fish along the Indian coast.",
        "locations":      [[18.9, 72.8], [15.5, 73.9], [12.0, 80.2]],
    },
    "Labeo rohita": {
        "common_name":    "Rohu",
        "sequence":       "ATGCTGGTATTCATCATAATCCTTGCAGTAATAGCCCACACCATACTAATCCCAACCTGCCTGGCAATAGCACAC",
        "conservation":   "Least Concern",
        "description":    "Most important freshwater food fish in India.",
        "locations":      [[25.0, 83.0], [23.5, 85.3], [22.1, 88.5]],
    },
    "Katsuwonus pelamis": {
        "common_name":    "Skipjack Tuna",
        "sequence":       "ATGCTCGTATTTATAATCATCCTTGCAGTCATAGCCCACACAATACTCATCCCAACCTGCCTGGCTATAGCGCAC",
        "conservation":   "Least Concern",
        "description":    "Abundant migratory tuna species in Indian Ocean tropical waters.",
        "locations":      [[6.0, 72.0], [4.5, 75.5], [8.0, 77.0]],
    },
}

def validate_sequence(seq):
    """Check if input is a valid DNA sequence (only ATCGN characters)."""
    seq_clean = seq.upper().replace(" ", "").replace("\n", "").replace("\r", "")
    if not seq_clean:
        return False, "Empty sequence"
    invalid = set(seq_clean) - set("ATCGN")
    if invalid:
        return False, f"Invalid characters found: {invalid}"
    if len(seq_clean) < 50:
        return False, "Sequence too short (minimum 50 bp)"
    if len(seq_clean) > 10000:
        return False, "Sequence too long (maximum 10000 bp)"
    return True, seq_clean

def sequence_stats(seq):
    """Calculate sequence statistics."""
    seq   = seq.upper()
    total = len(seq)
    gc    = (seq.count("G") + seq.count("C")) / total * 100
    at    = (seq.count("A") + seq.count("T")) / total * 100
    n     = seq.count("N") / total * 100
    quality = "Good" if n < 5 else ("Moderate" if n < 15 else "Poor")
    return {
        "length":      total,
        "gc_content":  round(gc, 1),
        "at_content":  round(at, 1),
        "n_content":   round(n, 1),
        "quality":     quality,
    }

def local_blast(query_seq):
    """
    Pairwise alignment against local reference database.
    Returns best match with similarity score.
    """
    query   = query_seq.upper()
    results = []

    for sci_name, info in LOCAL_DB.items():
        ref = info["sequence"].upper()
        # Use global alignment with match/mismatch scores
        alns = pairwise2.align.globalms(query[:200], ref[:200],
                                         2, -1, -2, -0.5)
        if alns:
            best_score = alns[0].score
            max_score  = 2 * min(len(query[:200]), len(ref[:200]))
            similarity = max(0, best_score / max_score * 100) if max_score > 0 else 0
            results.append({
                "scientific_name":   sci_name,
                "common_name":       info["common_name"],
                "similarity":        round(similarity, 1),
                "conservation":      info["conservation"],
                "description":       info["description"],
                "locations":         info["locations"],
            })

    if not results:
        return None

    best = max(results, key=lambda x: x["similarity"])
    return {
        "species_name":      best["common_name"],
        "scientific_name":   best["scientific_name"],
        "match_percentage":  best["similarity"],
        "e_value":           None,
        "method_used":       "Local",
        "description":       best["description"],
        "conservation_status": best["conservation"],
        "found_locations":   best["locations"],
    }

def ncbi_blast(query_seq, timeout=15):
    """
    Submit sequence to NCBI BLAST (free API).
    Returns top hit or None on failure/timeout.
    """
    try:
        Entrez.email = "marine@cmlre.gov.in"   # required by NCBI
        print("📡 Submitting to NCBI BLAST...")

        result_handle = NCBIWWW.qblast(
            "blastn", "nt", query_seq[:500],
            hitlist_size=5, expect=0.001,
        )

        blast_records = NCBIXML.parse(result_handle)
        record        = next(blast_records)

        if not record.alignments:
            return None

        top    = record.alignments[0]
        hsp    = top.hsps[0]
        length = hsp.align_length if hsp.align_length > 0 else 1
        pct    = round(hsp.identities / length * 100, 1)

        # Parse species from alignment title
        title       = top.title
        sci_name    = title.split("[")[-1].replace("]","").strip() if "[" in title else title[:40]
        common_name = sci_name   # fallback if not in LOCAL_DB

        # Check if it matches our local DB for extra info
        info    = {}
        for k, v in LOCAL_DB.items():
            if k.lower() in sci_name.lower() or sci_name.lower() in k.lower():
                info    = v
                sci_name = k
                common_name = v["common_name"]
                break

        return {
            "species_name":      common_name,
            "scientific_name":   sci_name,
            "match_percentage":  pct,
            "e_value":           float(hsp.expect),
            "method_used":       "NCBI",
            "description":       info.get("description", "Marine fish species."),
            "conservation_status": info.get("conservation", "Not evaluated"),
            "found_locations":   info.get("locations", []),
        }

    except Exception as e:
        print(f"⚠️  NCBI BLAST failed: {e}")
        return None

def match_edna(dna_sequence):
    """
    Main entry: try NCBI first, fall back to local.
    """
    valid, result = validate_sequence(dna_sequence)
    if not valid:
        raise ValueError(result)

    clean_seq = result
    stats     = sequence_stats(clean_seq)

    # Try NCBI first
    match = ncbi_blast(clean_seq)

    # Fallback to local
    if match is None:
        print("⚠️  Using local fallback database...")
        match = local_blast(clean_seq)

    if match is None:
        raise ValueError("No match found in NCBI or local database")

    match["sequence_stats"] = stats
    return match
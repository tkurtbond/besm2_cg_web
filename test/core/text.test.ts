// The checks of pobesm2_fmt2's test/TestText.Mod (besm2_cg_po's
// Besm2Text is pobesm2_fmt2's), with its labels, where they still mean
// something for JavaScript strings: the Oberon's checks of NIL, of
// ropes of several leaves, of List's growth and of Chars have no
// counterpart (a list is a string[], and a string is flat), and its
// checks of bytes are of UTF-8 (utf8) and of foldCI's byte strings.
import { test } from "node:test";
import assert from "node:assert/strict";
import * as T from "../../src/core/text.ts";

function check(ok: boolean, label: string): void {
  test(label, () => assert.ok(ok, label));
}

const less = T.lessCI;

check(T.displayLength("Body") === 4, "Length of ASCII text");
// "×" is C3 97; "“" is E2 80 9C.
check(T.utf8("Shots ×2").length === 9, "Length counts bytes");
check(
  T.displayLength("Shots ×2") === 8,
  "DisplayLength counts UTF-8 characters",
);
check(T.displayLength("“") === 1, "DisplayLength of a 3-byte character");
check(T.displayLength("") === 0, "DisplayLength of the empty rope");
check(
  T.displayLength("😀") === 1 && "😀".length === 2,
  "DisplayLength counts a character beyond U+FFFF once, not its UTF-16 units",
);
{
  const r =
    "Limited Shots ×2 and " +
    "“quoted” text that is long, " +
    "Élan and more to the end";
  check(
    T.utf8(r).length === 79 && T.displayLength(r) === 73,
    "DisplayLength across several leaves",
  );
}

check(T.trim("  a b  ") === "a b", "Trim strips blanks at both ends only");
check(
  T.trim("text\n") === "text",
  "Trim strips the newline a literal block scalar ends with",
);
check(
  T.trim("\t\r\n x\ny\t") === "x\ny",
  "Trim strips tab, CR and LF, not inside",
);
check(T.trim("   ") === "", "Trim of all blanks is empty");
check(T.trim("") === "", "Trim of the empty rope");
check(
  T.trim("untouched") === "untouched",
  "Trim returns a rope with nothing to strip as it is",
);
check(
  T.trim("\fpage\f").length === 6,
  "Trim keeps form feeds, which Ropes.Trim strips",
);
check(
  "\fpage\f".trim().length === 4,
  "(String.prototype.trim does strip them)",
);
check(
  T.trim(" x ") === " x ",
  "Trim keeps no-break spaces, which String.prototype.trim strips",
);

check(T.int(0) === "0", "Int of 0");
check(T.int(42) === "42", "Int of a positive number");
check(T.int(-7) === "-7", "Int of a negative number has an ASCII minus");
check(T.int(2147483647) === "2147483647", "Int of MAX(INTEGER)");
check(T.int(-2147483648) === "-2147483648", "Int of MIN(INTEGER)");

check(T.join([], ", ") === "", "Join of an empty list");
check(T.join(["one"], ", ") === "one", "Join of one item");
check(
  T.join(["one", "two", "three"], ", ") === "one, two, three",
  "Join of three items",
);
check(
  T.join(["one", "two", "three", "", "five"], ", ") ===
    "one, two, three, , five",
  "Join keeps an empty item's separators",
);

check(less("apple", "Banana"), "LessCI ignores case (a < B)");
check(!less("Banana", "apple"), "LessCI ignores case (not B < a)");
check(
  !less("Same", "sAME") && !less("sAME", "Same"),
  "LessCI: equal ignoring case",
);
check(less("Area", "Area Effect"), "LessCI: a proper prefix comes first");
check(
  less("", "a") && !less("a", "") && !less("", ""),
  "LessCI: the empty rope comes first",
);
check(less("Zebra", "Élan"), "LessCI: ASCII before a UTF-8 lead byte");
// The Ada To_Lower folding: "É" is C3 89, and C3 is folded to E3, past
// "“" (E2 80 9C), which isn't folded.
check(
  less("“quoted”", "Élan"),
  "LessCI folds UTF-8 lead byte C3 as Ada's To_Lower does",
);
check("“quoted”".toLowerCase() > "Élan".toLowerCase(), "(toLowerCase doesn't)");
check(
  T.lessCI(
    "The Same Long Prefix, continued in a second leaf, ending in A",
    "the same long prefix, continued in a second leaf, ending in b",
  ),
  "LessCI across several leaves",
);
check(
  T.foldCI("A×") === "a\u00e3\u0097",
  "FoldCI gives the folded UTF-8 bytes, one character each",
);

{
  const l = ["delta", "Charlie", "alpha", "Bravo", "ALPHA"];
  T.sortCI(l);
  check(
    T.join(l, ",") === "alpha,ALPHA,Bravo,Charlie,delta",
    "SortCI sorts ignoring case, keeping equal items in order",
  );
  check(
    l[0] === "alpha" && l[1] === "ALPHA",
    "SortCI keeps the items' own case",
  );
  const e: string[] = [];
  T.sortCI(e);
  check(e.length === 0, "SortCI of an empty list");
}
{
  const l = ["c", "a", "b"];
  const keys = ["3", "1", "2"];
  T.sortByKey(l, keys);
  check(
    l.join("") === "abc" && keys.join("") === "123",
    "sortByKey sorts the items by their keys, and the keys with them",
  );
}

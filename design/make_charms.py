"""Writes the built-in charm artwork and manifests into /charms. Run: python3 design/make_charms.py"""
import json, os

INK = "#2B2320"
W = 'stroke="%s" stroke-width="6" stroke-linejoin="round" stroke-linecap="round"' % INK
GLOSS = 'fill="none" stroke="#FFFFFF" stroke-opacity="0.55" stroke-width="7" stroke-linecap="round"'

def svg(body):
    return ('<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200">\n'
            + body.strip() + "\n</svg>\n")

def eyes(y, dx=18, cx=100, r=5.5):
    return f'<circle cx="{cx-dx}" cy="{y}" r="{r}" fill="{INK}"/><circle cx="{cx+dx}" cy="{y}" r="{r}" fill="{INK}"/>'

def blush(y, dx=32, cx=100, color="#F28C8C"):
    return (f'<ellipse cx="{cx-dx}" cy="{y}" rx="8" ry="5" fill="{color}" opacity="0.7"/>'
            f'<ellipse cx="{cx+dx}" cy="{y}" rx="8" ry="5" fill="{color}" opacity="0.7"/>')

CHARMS = {
"moon": dict(name="Moon", category="space", tags=["minimal"], rope="thread",
  desc="A sleepy crescent for late nights.", anchor=(0.5, 0.06), svg=svg(f'''
<path d="M100 12 A 88 88 0 1 0 188 112 A 70 70 0 1 1 100 12 Z" fill="#F6D365" {W}/>
<path d="M54 60 C 38 84, 34 116, 44 140" {GLOSS}/>
<path d="M150 48 l 4 10 l 10 4 l -10 4 l -4 10 l -4 -10 l -10 -4 l 10 -4 Z" fill="#F6D365" stroke="{INK}" stroke-width="3.5" stroke-linejoin="round"/>
<circle cx="132" cy="96" r="4" fill="#F6D365" stroke="{INK}" stroke-width="3"/>
''')),
"star": dict(name="Star", category="space", tags=["cute"], rope="thread",
  desc="Wish on it whenever you like.", anchor=(0.5, 0.07), svg=svg(f'''
<path d="M100 14 L124 70 L184 76 L138 116 L152 176 L100 145 L48 176 L62 116 L16 76 L76 70 Z" fill="#F6D365" {W}/>
<path d="M78 84 L62 88" {GLOSS}/>
{eyes(108, dx=14, r=5)}
<path d="M92 122 q 8 7 16 0" fill="none" stroke="{INK}" stroke-width="5" stroke-linecap="round"/>
''')),
"planet": dict(name="Planet", category="space", tags=["retro"], rope="minimal",
  desc="A small world with a nice ring.", anchor=(0.5, 0.2), svg=svg(f'''
<g transform="rotate(-16 100 106)">
<path d="M10 106 A 90 26 0 0 1 190 106" fill="none" stroke="{INK}" stroke-width="17"/>
<path d="M10 106 A 90 26 0 0 1 190 106" fill="none" stroke="#EE9B45" stroke-width="7"/>
</g>
<circle cx="100" cy="104" r="62" fill="#B7A6E0" {W}/>
<path d="M44 92 C 70 84, 100 98, 156 86" fill="none" stroke="#9A86CF" stroke-width="9" stroke-linecap="round"/>
<path d="M50 126 C 80 118, 112 132, 150 122" fill="none" stroke="#9A86CF" stroke-width="7" stroke-linecap="round"/>
<path d="M66 70 C 72 62, 82 56, 92 54" {GLOSS}/>
<g transform="rotate(-16 100 106)">
<path d="M10 106 A 90 26 0 0 0 190 106" fill="none" stroke="{INK}" stroke-width="17" stroke-linecap="round"/>
<path d="M10 106 A 90 26 0 0 0 190 106" fill="none" stroke="#EE9B45" stroke-width="7" stroke-linecap="round"/>
</g>
''')),
"mushroom": dict(name="Mushroom", category="nature", tags=["cute", "seasonal"], rope="cord",
  desc="Grown in a very tidy forest.", anchor=(0.5, 0.1), svg=svg(f'''
<path d="M72 112 L66 170 Q 100 186 134 170 L128 112 Z" fill="#FFF6E4" {W}/>
<path d="M100 20 C 40 20, 12 70, 16 108 Q 18 120 32 120 L168 120 Q 182 120 184 108 C 188 70, 160 20, 100 20 Z" fill="#D9503B" {W}/>
<circle cx="64" cy="70" r="13" fill="#FFF6E4"/><circle cx="118" cy="50" r="10" fill="#FFF6E4"/>
<circle cx="146" cy="88" r="12" fill="#FFF6E4"/><circle cx="96" cy="94" r="7" fill="#FFF6E4"/>
<path d="M44 58 C 52 44, 62 36, 74 32" {GLOSS}/>
{eyes(146, dx=12, r=4.5)}
''')),
"cat": dict(name="Cat", category="cute", tags=[], rope="thread",
  desc="Aloof, but hangs around anyway.", anchor=(0.5, 0.23), svg=svg(f'''
<path d="M40 70 L36 22 L78 48 Q 100 42 122 48 L164 22 L160 70 C 178 100, 170 170, 100 172 C 30 170, 22 100, 40 70 Z" fill="#F4B26A" {W}/>
<path d="M46 60 L46 38 L64 52 Z" fill="#F7A7A0"/><path d="M154 60 L154 38 L136 52 Z" fill="#F7A7A0"/>
<path d="M88 50 L92 70 M100 48 L100 70 M112 50 L108 70" stroke="#D98B3E" stroke-width="5" stroke-linecap="round"/>
{eyes(112, dx=26, r=6)}
<path d="M94 128 L106 128 L100 135 Z" fill="{INK}"/>
<path d="M100 135 q -8 10 -16 4 M100 135 q 8 10 16 4" fill="none" stroke="{INK}" stroke-width="4" stroke-linecap="round"/>
<path d="M60 128 L30 124 M60 138 L32 144 M140 128 L170 124 M140 138 L168 144" stroke="{INK}" stroke-width="3" stroke-linecap="round"/>
{blush(140, dx=44)}
''')),
"ghost": dict(name="Tiny Ghost", category="cute", tags=["seasonal"], rope="minimal",
  desc="Friendly. Mostly.", anchor=(0.5, 0.08), svg=svg(f'''
<path d="M100 16 C 52 16, 36 56, 36 96 L36 170 Q 50 184 62 170 Q 74 156 86 170 Q 100 184 114 170 Q 126 156 138 170 Q 150 184 164 170 L164 96 C 164 56, 148 16, 100 16 Z" fill="#FFFFFF" {W}/>
<path d="M60 56 C 64 44, 72 36, 82 32" fill="none" stroke="#DCE6F2" stroke-width="7" stroke-linecap="round"/>
<ellipse cx="80" cy="92" rx="8" ry="11" fill="{INK}"/><ellipse cx="120" cy="92" rx="8" ry="11" fill="{INK}"/>
<ellipse cx="100" cy="122" rx="9" ry="7" fill="{INK}"/>
{blush(112, dx=38, color="#F7A7B5")}
''')),
"coin": dict(name="Lucky Coin", category="retro", tags=["minimal"], rope="chain",
  desc="Keeps a little luck on hand.", anchor=(0.5, 0.08), svg=svg(f'''
<circle cx="100" cy="102" r="86" fill="#E6B450" {W}/>
<circle cx="100" cy="102" r="66" fill="none" stroke="#B9852E" stroke-width="5"/>
<g fill="#B9852E" stroke="{INK}" stroke-width="3.5">
<circle cx="88" cy="90" r="15"/><circle cx="112" cy="90" r="15"/><circle cx="88" cy="114" r="15"/><circle cx="112" cy="114" r="15"/>
</g>
<path d="M100 114 Q 104 136 116 146" fill="none" stroke="{INK}" stroke-width="4" stroke-linecap="round"/>
<path d="M44 70 C 52 52, 66 40, 84 34" {GLOSS}/>
''')),
"leaf": dict(name="Leaf", category="nature", tags=["seasonal", "minimal"], rope="thread",
  desc="The first one of autumn.", anchor=(0.5, 0.05), svg=svg(f'''
<path d="M100 10 L100 36" stroke="{INK}" stroke-width="7" stroke-linecap="round"/>
<path d="M100 36 C 150 44, 184 86, 176 124 C 168 160, 128 186, 100 188 C 72 186, 32 160, 24 124 C 16 86, 50 44, 100 36 Z" fill="#EE9B45" {W}/>
<path d="M100 44 L100 176 M100 82 L62 62 M100 82 L138 62 M100 116 L50 100 M100 116 L150 100 M100 148 L64 140 M100 148 L136 140" fill="none" stroke="#C8692A" stroke-width="5" stroke-linecap="round"/>
<path d="M46 106 C 48 88, 58 72, 72 62" {GLOSS}/>
''')),
"crystal": dict(name="Crystal", category="minimal", tags=["nature"], rope="chain",
  desc="Catches light that isn't there.", anchor=(0.5, 0.07), svg=svg(f'''
<path d="M100 14 L154 56 L136 176 L64 176 L46 56 Z" fill="#A8D8E8" {W}/>
<path d="M100 14 L80 60 L100 176 L120 60 Z M46 56 L80 60 L120 60 L154 56" fill="none" stroke="{INK}" stroke-width="4" stroke-linejoin="round"/>
<path d="M80 60 L100 176 L64 176 Z" fill="#7FBCD6"/>
<path d="M120 60 L154 56 L136 176 Z" fill="#C9E8F2"/>
<path d="M100 14 L154 56 L136 176 L64 176 L46 56 Z" fill="none" {W}/>
<path d="M66 70 L60 110" {GLOSS}/>
''')),
"cloud": dict(name="Cloud", category="nature", tags=["minimal", "cute"], rope="minimal",
  desc="Soft weather, indoors.", anchor=(0.56, 0.23), svg=svg(f'''
<path d="M56 150 C 26 150, 16 116, 40 104 C 34 76, 64 58, 86 70 C 94 44, 136 42, 144 74 C 172 70, 190 102, 172 122 C 190 140, 170 158, 150 150 Z" fill="#FFFFFF" {W}/>
<path d="M58 100 C 60 90, 68 82, 78 80" fill="none" stroke="#DCE6F2" stroke-width="7" stroke-linecap="round"/>
{eyes(116, dx=16, r=5)}
<path d="M92 128 q 8 7 16 0" fill="none" stroke="{INK}" stroke-width="5" stroke-linecap="round"/>
<path d="M80 170 l -6 14 M110 172 l -6 14" stroke="#7FB0D8" stroke-width="7" stroke-linecap="round"/>
''')),
"camera": dict(name="Camera", category="retro", tags=[], rope="cord",
  desc="Every day is worth one frame.", anchor=(0.5, 0.2), svg=svg(f'''
<path d="M70 58 L80 40 L120 40 L130 58 Z" fill="#8A5A3B" {W}/>
<rect x="20" y="58" width="160" height="108" rx="18" fill="#FFF6E4" {W}/>
<rect x="20" y="84" width="160" height="56" fill="#8A5A3B" stroke="{INK}" stroke-width="5"/>
<rect x="20" y="58" width="160" height="108" rx="18" fill="none" {W}/>
<circle cx="100" cy="112" r="38" fill="#3A4660" {W}/>
<circle cx="100" cy="112" r="22" fill="#27304A" stroke="#6F7FA8" stroke-width="4"/>
<circle cx="90" cy="102" r="7" fill="#FFFFFF" opacity="0.75"/>
<rect x="144" y="68" width="22" height="12" rx="3" fill="#E6B450" stroke="{INK}" stroke-width="4"/>
<circle cx="40" cy="72" r="5" fill="#D9503B"/>
''')),
"coffee": dict(name="Coffee Cup", category="minimal", tags=["cute"], rope="thread",
  desc="Always warm, never spills.", anchor=(0.5, 0.26), svg=svg(f'''
<path d="M70 14 C 60 26, 80 34, 70 46 M132 14 C 122 26, 142 34, 132 46" fill="none" stroke="#BFB2A3" stroke-width="6" stroke-linecap="round"/>
<path d="M148 88 C 186 84, 186 136, 146 136" fill="none" stroke="{INK}" stroke-width="18" stroke-linecap="round"/>
<path d="M148 88 C 186 84, 186 136, 146 136" fill="none" stroke="#FFF6E4" stroke-width="7" stroke-linecap="round"/>
<path d="M34 62 L166 62 L152 158 Q 148 180 124 180 L76 180 Q 52 180 48 158 Z" fill="#FFF6E4" {W}/>
<path d="M40 88 L160 88 L156 112 L44 112 Z" fill="#D9503B"/>
<ellipse cx="100" cy="62" rx="66" ry="10" fill="#8A5A3B" {W}/>
<path d="M58 130 C 60 146, 66 160, 76 166" {GLOSS}/>
''')),
"heart": dict(name="Tiny Heart", category="cute", tags=["minimal", "seasonal"], rope="thread",
  desc="Small, but it counts.", anchor=(0.5, 0.3), svg=svg(f'''
<path d="M100 60 C 88 30, 40 22, 24 58 C 10 92, 50 136, 100 178 C 150 136, 190 92, 176 58 C 160 22, 112 30, 100 60 Z" fill="#E35D6A" {W}/>
<path d="M46 60 C 50 50, 58 44, 70 42" {GLOSS}/>
<path d="M40 82 L42 90" {GLOSS}/>
''')),
"sword": dict(name="Pixel Sword", category="retro", tags=[], rope="chain",
  desc="Level one. Still counts.", anchor=(0.5, 0.05), svg=svg(f'''
<g shape-rendering="crispEdges" stroke="{INK}" stroke-width="5" stroke-linejoin="miter">
<path d="M88 10 H112 V34 H88 Z" fill="#E6B450"/>
<path d="M92 34 H108 V64 H92 Z" fill="#8A5A3B"/>
<path d="M60 64 H140 V80 H60 Z" fill="#E6B450"/>
<path d="M88 80 H112 V164 L100 188 L88 164 Z" fill="#D8DEE8"/>
</g>
<path d="M100 84 V168" stroke="#FFFFFF" stroke-width="5" opacity="0.8"/>
<path d="M92 40 H108 M92 50 H108" stroke="#5C3A24" stroke-width="3"/>
''')),
"sun": dict(name="Smiling Sun", category="cute", tags=["seasonal", "nature"], rope="cord",
  desc="Brings its own good weather.", anchor=(0.5, 0.08), svg=svg(f'''
<g fill="#F6D365" stroke="{INK}" stroke-width="5" stroke-linejoin="round">
<path d="M100 16 L112 42 L88 42 Z"/><path d="M100 188 L88 162 L112 162 Z"/>
<path d="M12 102 L38 90 L38 114 Z"/><path d="M188 102 L162 114 L162 90 Z"/>
<path d="M38 40 L64 50 L48 66 Z"/><path d="M162 40 L152 66 L136 50 Z"/>
<path d="M38 164 L48 138 L64 154 Z"/><path d="M162 164 L136 154 L152 138 Z"/>
</g>
<circle cx="100" cy="102" r="56" fill="#F6C24B" {W}/>
<path d="M68 78 C 72 68, 80 60, 90 58" {GLOSS}/>
<path d="M76 98 q 8 -8 16 0 M108 98 q 8 -8 16 0" fill="none" stroke="{INK}" stroke-width="5" stroke-linecap="round"/>
<path d="M80 118 q 20 20 40 0" fill="none" stroke="{INK}" stroke-width="5" stroke-linecap="round"/>
{blush(116, dx=36, color="#EE8A5A")}
''')),
}


EXTRA = {
"cherry": dict(name="Cherries", category="nature", tags=["cute", "retro"], rope="thread",
  desc="Two is better than one.", anchor=(0.62, 0.06), svg=svg(f'''
<path d="M124 12 C 110 50, 80 80, 64 116 M124 12 C 128 56, 134 92, 138 118" fill="none" stroke="#5B7A3A" stroke-width="7" stroke-linecap="round"/>
<path d="M124 14 C 146 8, 170 20, 176 40 C 150 44, 132 34, 124 14 Z" fill="#8DB38B" {W}/>
<circle cx="62" cy="142" r="38" fill="#D9503B" {W}/>
<circle cx="140" cy="146" r="38" fill="#C8412B" {W}/>
<path d="M42 130 C 44 120, 50 114, 58 112" {GLOSS}/>
<path d="M120 134 C 122 124, 128 118, 136 116" {GLOSS}/>
''')),
"bell": dict(name="Little Bell", category="seasonal", tags=["retro", "minimal"], rope="cord",
  desc="Rings only in your head.", anchor=(0.5, 0.1), svg=svg(f'''
<path d="M100 20 C 60 20, 50 60, 48 100 C 46 130, 30 140, 26 152 L174 152 C 170 140, 154 130, 152 100 C 150 60, 140 20, 100 20 Z" fill="#E6B450" {W}/>
<rect x="22" y="148" width="156" height="16" rx="8" fill="#B9852E" {W}/>
<circle cx="100" cy="176" r="13" fill="#B9852E" {W}/>
<path d="M68 60 C 64 76, 62 96, 62 116" {GLOSS}/>
<path d="M74 136 L126 136" stroke="#B9852E" stroke-width="5" stroke-linecap="round"/>
''')),
"key": dict(name="Old Key", category="retro", tags=["minimal"], rope="chain",
  desc="Opens something, somewhere.", anchor=(0.5, 0.05), svg=svg(f'''
<path d="M100 10 a 34 34 0 1 1 -0.1 0 Z M100 30 a 14 14 0 1 0 0.1 0 Z" fill="#D8B25C" fill-rule="evenodd" {W}/>
<path d="M90 76 L110 76 L110 184 L90 184 Z" fill="#D8B25C" {W}/>
<path d="M110 146 L136 146 L136 160 L110 160 M110 168 L128 168 L128 182 L110 182" fill="#D8B25C" {W}/>
<path d="M76 30 C 72 38, 70 46, 72 54" {GLOSS}/>
''')),
"snowflake": dict(name="Snowflake", category="seasonal", tags=["minimal", "nature"], rope="minimal",
  desc="No two alike. This one's yours.", anchor=(0.5, 0.06), svg=svg(f'''
<g stroke="{INK}" stroke-width="16" stroke-linecap="round">
<path d="M100 14 V186 M26 57 L174 143 M26 143 L174 57"/>
</g>
<g stroke="#A8D8E8" stroke-width="8" stroke-linecap="round" fill="none">
<path d="M100 14 V186 M26 57 L174 143 M26 143 L174 57"/>
<path d="M84 34 L100 50 L116 34 M84 166 L100 150 L116 166 M40 80 L62 70 L58 46 M160 120 L138 130 L142 154 M40 120 L62 130 L58 154 M160 80 L138 70 L142 46"/>
</g>
<circle cx="100" cy="100" r="14" fill="#FFFFFF" {W}/>
''')),
"pumpkin": dict(name="Pumpkin", category="seasonal", tags=["nature", "cute"], rope="cord",
  desc="Harvest-ready, no carving needed.", anchor=(0.52, 0.08), svg=svg(f'''
<path d="M100 44 C 104 30, 108 20, 116 14" fill="none" stroke="#5B7A3A" stroke-width="10" stroke-linecap="round"/>
<path d="M100 48 C 56 36, 14 70, 18 118 C 22 166, 70 184, 100 172 C 130 184, 178 166, 182 118 C 186 70, 144 36, 100 48 Z" fill="#EE9B45" {W}/>
<path d="M100 50 C 84 80, 84 150, 100 172 M100 50 C 116 80, 116 150, 100 172 M60 52 C 44 90, 50 150, 70 178 M140 52 C 156 90, 150 150, 130 178" fill="none" stroke="#C8692A" stroke-width="5"/>
<path d="M36 96 C 38 82, 46 70, 56 64" {GLOSS}/>
<path d="M118 20 C 136 14, 152 22, 156 36" fill="none" stroke="#5B7A3A" stroke-width="5" stroke-linecap="round"/>
''')),
"rainbow": dict(name="Rainbow", category="cute", tags=["nature", "retro"], rope="thread",
  desc="After every little storm.", anchor=(0.5, 0.22), svg=svg(f'''
<path d="M38 150 A 62 62 0 0 1 162 150" fill="none" stroke="{INK}" stroke-width="60"/>
<path d="M22 150 A 78 78 0 0 1 178 150" fill="none" stroke="#E35D6A" stroke-width="16"/>
<path d="M38 150 A 62 62 0 0 1 162 150" fill="none" stroke="#F6D365" stroke-width="16"/>
<path d="M54 150 A 46 46 0 0 1 146 150" fill="none" stroke="#8EC5E8" stroke-width="16"/>
<path d="M14 170 C 6 150, 30 138, 44 150 C 58 136, 80 150, 70 170 Z" fill="#FFFFFF" {W}/>
<path d="M130 170 C 120 150, 144 136, 156 150 C 170 138, 194 150, 186 170 Z" fill="#FFFFFF" {W}/>
''')),
"rocket": dict(name="Rocket", category="space", tags=["retro"], rope="minimal",
  desc="Destination: somewhere nice.", anchor=(0.5, 0.05), svg=svg(f'''
<path d="M66 118 L40 156 L70 150 Z M134 118 L160 156 L130 150 Z" fill="#D9503B" {W}/>
<path d="M100 10 C 138 40, 144 100, 132 150 L68 150 C 56 100, 62 40, 100 10 Z" fill="#FFF6E4" {W}/>
<circle cx="100" cy="82" r="18" fill="#8EC5E8" {W}/>
<path d="M84 150 L116 150 L108 176 L92 176 Z" fill="#8A5A3B" {W}/>
<path d="M92 176 Q 100 196 108 176" fill="#F6D365" stroke="#EE9B45" stroke-width="4"/>
<path d="M78 58 C 76 70, 76 86, 78 104" {GLOSS}/>
<path d="M76 34 Q 100 46 124 34" fill="none" stroke="#D9503B" stroke-width="7"/>
''')),
"balloon": dict(name="Balloon", category="cute", tags=["minimal"], rope="thread",
  desc="Floats, but stays put.", anchor=(0.5, 0.06), svg=svg(f'''
<path d="M100 12 C 146 12, 170 50, 166 88 C 162 126, 124 150, 104 156 L108 170 L92 170 L96 156 C 76 150, 38 126, 34 88 C 30 50, 54 12, 100 12 Z" fill="#E35D6A" {W}/>
<path d="M100 170 C 94 178, 108 184, 100 192" fill="none" stroke="{INK}" stroke-width="4" stroke-linecap="round"/>
<path d="M62 50 C 68 38, 78 32, 90 30" {GLOSS}/>
<ellipse cx="66" cy="72" rx="5" ry="9" fill="#FFFFFF" opacity="0.5"/>
''')),
"strawberry": dict(name="Strawberry", category="nature", tags=["cute", "seasonal"], rope="thread",
  desc="Picked at exactly the right time.", anchor=(0.5, 0.08), svg=svg(f'''
<path d="M100 44 C 150 30, 186 60, 176 100 C 164 146, 124 184, 100 188 C 76 184, 36 146, 24 100 C 14 60, 50 30, 100 44 Z" fill="#E35D6A" {W}/>
<path d="M100 16 L100 40 M58 44 L86 34 L100 50 L114 34 L142 44 L120 58 L100 52 L80 58 Z" fill="#8DB38B" {W}/>
<g fill="#FFF1C9"><ellipse cx="64" cy="90" rx="3.5" ry="5"/><ellipse cx="100" cy="84" rx="3.5" ry="5"/><ellipse cx="136" cy="90" rx="3.5" ry="5"/><ellipse cx="80" cy="120" rx="3.5" ry="5"/><ellipse cx="120" cy="120" rx="3.5" ry="5"/><ellipse cx="100" cy="150" rx="3.5" ry="5"/><ellipse cx="60" cy="126" rx="3.5" ry="5"/><ellipse cx="140" cy="126" rx="3.5" ry="5"/></g>
<path d="M44 84 C 44 72, 50 62, 60 56" {GLOSS}/>
''')),
"note": dict(name="Music Note", category="retro", tags=["minimal"], rope="chain",
  desc="Hums your favourite song.", anchor=(0.62, 0.07), svg=svg(f'''
<path d="M118 16 L172 30 L172 58 L132 48 L132 146" fill="none" stroke="{INK}" stroke-width="16" stroke-linejoin="round" stroke-linecap="round"/>
<path d="M118 16 L172 30 L172 58 L132 48 L132 146" fill="none" stroke="#B7A6E0" stroke-width="6" stroke-linejoin="round" stroke-linecap="round"/>
<ellipse cx="96" cy="152" rx="40" ry="30" transform="rotate(-18 96 152)" fill="#B7A6E0" {W}/>
<path d="M72 146 C 74 138, 80 132, 88 130" {GLOSS}/>
''')),
"cassette": dict(name="Mixtape", category="retro", tags=[], rope="cord",
  desc="Side A: good days.", anchor=(0.5, 0.2), svg=svg(f'''
<rect x="14" y="42" width="172" height="116" rx="12" fill="#2C3B5E" {W}/>
<rect x="34" y="60" width="132" height="50" rx="6" fill="#FFF6E4" stroke="{INK}" stroke-width="4"/>
<rect x="34" y="60" width="132" height="14" fill="#E35D6A"/>
<circle cx="72" cy="92" r="11" fill="#FFFFFF" {W}/><circle cx="128" cy="92" r="11" fill="#FFFFFF" {W}/>
<path d="M50 158 L60 128 L140 128 L150 158" fill="#3A4A70" {W}/>
<circle cx="80" cy="144" r="4" fill="{INK}"/><circle cx="120" cy="144" r="4" fill="{INK}"/>
''')),
"dice": dict(name="Lucky Die", category="retro", tags=["minimal"], rope="chain",
  desc="Always rolls a six. Probably.", anchor=(0.5, 0.08), svg=svg(f'''
<path d="M100 16 L176 58 L176 144 L100 186 L24 144 L24 58 Z" fill="#FFF6E4" {W}/>
<path d="M24 58 L100 100 L176 58 M100 100 L100 186" fill="none" stroke="{INK}" stroke-width="5" stroke-linejoin="round"/>
<path d="M100 100 L176 58 L176 144 L100 186 Z" fill="#EFE2C8"/>
<path d="M24 58 L100 100 L176 58 M100 100 L100 186 M100 16 L176 58 L176 144 L100 186 L24 144 L24 58 Z" fill="none" {W}/>
<ellipse cx="100" cy="58" rx="10" ry="6" fill="#D9503B"/>
<circle cx="44" cy="96" r="6" fill="{INK}"/><circle cx="62" cy="120" r="6" fill="{INK}"/><circle cx="80" cy="146" r="6" fill="{INK}"/>
<circle cx="124" cy="116" r="6" fill="{INK}"/><circle cx="152" cy="100" r="6" fill="{INK}"/><circle cx="124" cy="156" r="6" fill="{INK}"/><circle cx="152" cy="140" r="6" fill="{INK}"/>
''')),
"clover": dict(name="Four-Leaf Clover", category="nature", tags=["seasonal", "minimal"], rope="thread",
  desc="Found it on the first try.", anchor=(0.5, 0.08), svg=svg(f'''
<path d="M100 104 C 120 140, 124 170, 140 190" fill="none" stroke="#4F7A55" stroke-width="9" stroke-linecap="round"/>
<g fill="#8DB38B" stroke="{INK}" stroke-width="6" stroke-linejoin="round">
<path d="M100 100 C 70 90, 60 60, 76 42 C 88 30, 100 40, 100 52 C 100 40, 112 30, 124 42 C 140 60, 130 90, 100 100 Z"/>
<path d="M100 100 C 70 110, 60 140, 76 158 C 88 170, 100 160, 100 148 C 100 160, 112 170, 124 158 C 140 140, 130 110, 100 100 Z"/>
<path d="M100 100 C 90 70, 60 60, 42 76 C 30 88, 40 100, 52 100 C 40 100, 30 112, 42 124 C 60 140, 90 130, 100 100 Z"/>
<path d="M100 100 C 110 70, 140 60, 158 76 C 170 88, 160 100, 148 100 C 160 100, 170 112, 158 124 C 140 140, 110 130, 100 100 Z"/>
</g>
<path d="M78 56 C 80 50, 84 46, 90 44" {GLOSS}/>
''')),
"donut": dict(name="Donut", category="cute", tags=["retro"], rope="cord",
  desc="Sprinkles are non-negotiable.", anchor=(0.5, 0.08), svg=svg(f'''
<path d="M100 16 a 84 84 0 1 1 -0.1 0 Z M100 74 a 26 26 0 1 0 0.1 0 Z" fill="#E6B87A" fill-rule="evenodd" {W}/>
<path d="M100 26 C 150 26, 180 60, 176 100 C 172 116, 160 110, 156 124 C 150 140, 136 128, 124 140 C 112 150, 104 138, 94 146 C 80 156, 72 140, 60 140 C 44 140, 40 124, 30 116 C 20 104, 24 60, 60 36 C 72 28, 86 26, 100 26 Z M100 74 a 26 26 0 1 0 0.1 0 Z" fill="#F2A7B5" fill-rule="evenodd" stroke="{INK}" stroke-width="5" stroke-linejoin="round"/>
<g stroke-width="6" stroke-linecap="round">
<path d="M60 60 l10 -4" stroke="#8EC5E8"/><path d="M130 48 l8 8" stroke="#F6D365"/><path d="M150 90 l2 10" stroke="#FFFFFF"/>
<path d="M48 100 l4 10" stroke="#F6D365"/><path d="M96 50 l10 2" stroke="#FFFFFF"/><path d="M140 124 l-8 6" stroke="#8EC5E8"/>
<path d="M72 126 l-10 -4" stroke="#8DB38B"/>
</g>
''')),
"cactus": dict(name="Cactus", category="nature", tags=["cute", "minimal"], rope="minimal",
  desc="Low maintenance, high charm.", anchor=(0.5, 0.06), svg=svg(f'''
<path d="M58 150 L142 150 L132 188 L68 188 Z" fill="#D9824A" {W}/>
<rect x="50" y="140" width="100" height="18" rx="4" fill="#C8692A" {W}/>
<path d="M76 140 L76 44 C 76 8, 124 8, 124 44 L124 140 Z" fill="#8DB38B" {W}/>
<path d="M76 98 L56 98 C 40 98, 36 86, 36 72 L36 58 C 36 46, 54 46, 54 58 L54 76 L76 76 M124 86 L146 86 C 160 86, 164 74, 164 62 L164 50 C 164 38, 146 38, 146 50 L146 66 L124 66" fill="#8DB38B" {W}/>
<path d="M100 30 V130" stroke="#6F9A6C" stroke-width="5" stroke-linecap="round"/>
{eyes(84, dx=10, r=4)}
<path d="M94 96 q 6 5 12 0" fill="none" stroke="{INK}" stroke-width="4" stroke-linecap="round"/>
''')),
}
CHARMS.update(EXTRA)

root = os.path.join(os.path.dirname(__file__), "..", "charms")
for cid, c in CHARMS.items():
    d = os.path.join(root, cid)
    os.makedirs(d, exist_ok=True)
    with open(os.path.join(d, "charm.svg"), "w") as f:
        f.write(c["svg"])
    manifest = {
        "id": cid,
        "name": c["name"],
        "category": c["category"],
        "tags": c["tags"],
        "defaultScale": 1,
        "ropeStyle": c["rope"],
        "anchorOffset": {"x": c["anchor"][0], "y": c["anchor"][1]},
        "metadata": {"description": c["desc"], "author": "Dangle"},
    }
    with open(os.path.join(d, "charm.json"), "w") as f:
        json.dump(manifest, f, indent=2)
        f.write("\n")
print("wrote", len(CHARMS), "charms")

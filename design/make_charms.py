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

def pixels(rows, colors, cell, ox, oy):
    """Pixel art from strings; each character maps to a colour, '.' is empty."""
    out = []
    for y, row in enumerate(rows):
        for x, ch in enumerate(row):
            if ch in colors:
                out.append(f'<rect x="{ox + x * cell}" y="{oy + y * cell}" width="{cell}" height="{cell}" fill="{colors[ch]}"/>')
    return f'<g shape-rendering="crispEdges">{"".join(out)}</g>'

def burst(cx, cy, r_out, r_in, n):
    import math
    pts = []
    for i in range(n * 2):
        r = r_out if i % 2 == 0 else r_in
        a = -math.pi / 2 + i * math.pi / n
        pts.append(f"{cx + r * math.cos(a):.1f},{cy + r * math.sin(a):.1f}")
    return " ".join(pts)

COLLECTIONS = [
    {"id": "originals", "name": "Dangle Originals", "description": "The first thirty. Little things with big personalities."},
    {"id": "hero-squad", "name": "Hero Squad", "description": "Masks, capes, and big entrances."},
    {"id": "wizard-school", "name": "Wizard School", "description": "Wands, potions, and a very wise owl."},
    {"id": "galaxy-rebels", "name": "Galaxy Rebels", "description": "For pilots, tinkerers, and stargazers."},
    {"id": "anime-cafe", "name": "Anime Café", "description": "Snacks and keepsakes from your favourite slice-of-life."},
    {"id": "retro-arcade", "name": "Retro Arcade", "description": "Insert coin. Press start."},
]

NEW = {
# ---------- Hero Squad ----------
"hero-mask": dict(collection="hero-squad", name="Hero Mask", category="retro", tags=["cute"], rope="cord",
  desc="Secret identity: safe.", anchor=(0.5, 0.34), svg=svg(f"""
<path d="M22 92 C 22 64, 62 58, 100 70 C 138 58, 178 64, 178 92 C 178 128, 150 142, 128 132 C 116 126, 108 114, 100 114 C 92 114, 84 126, 72 132 C 50 142, 22 128, 22 92 Z" fill="#D9503B" {W}/>
<path d="M22 96 L6 110 M178 96 L194 110" stroke="{INK}" stroke-width="6" stroke-linecap="round"/>
<path d="M44 98 C 54 82, 78 82, 86 100 C 72 110, 54 110, 44 98 Z" fill="#FFF6E4" stroke="{INK}" stroke-width="5" stroke-linejoin="round"/>
<path d="M156 98 C 146 82, 122 82, 114 100 C 128 110, 146 110, 156 98 Z" fill="#FFF6E4" stroke="{INK}" stroke-width="5" stroke-linejoin="round"/>
<path d="M48 76 C 60 70, 74 70, 84 74" {GLOSS}/>
""")),
"bolt-shield": dict(collection="hero-squad", name="Bolt Shield", category="retro", tags=["minimal"], rope="chain",
  desc="Blocks bad days.", anchor=(0.5, 0.07), svg=svg(f"""
<path d="M100 14 L176 56 L176 144 L100 186 L24 144 L24 56 Z" fill="#2C3B5E" {W}/>
<path d="M100 36 L156 68 L156 132 L100 164 L44 132 L44 68 Z" fill="none" stroke="#E6B450" stroke-width="7" stroke-linejoin="round"/>
<path d="M112 52 L76 106 L98 106 L86 150 L126 92 L104 92 Z" fill="#F6D365" stroke="{INK}" stroke-width="5" stroke-linejoin="round"/>
<path d="M40 72 L40 104" {GLOSS}/>
""")),
"power-glove": dict(collection="hero-squad", name="Power Glove", category="retro", tags=[], rope="cord",
  desc="Charged and ready.", anchor=(0.5, 0.15), svg=svg(f"""
<g fill="#D8DEE8" stroke="{INK}" stroke-width="6" stroke-linejoin="round">
<rect x="52" y="30" width="24" height="56" rx="12"/><rect x="76" y="24" width="24" height="62" rx="12"/>
<rect x="100" y="28" width="24" height="58" rx="12"/><rect x="124" y="38" width="22" height="50" rx="11"/>
<path d="M50 120 C 30 112, 24 92, 34 84 C 42 78, 52 90, 56 100 Z"/>
<rect x="48" y="66" width="102" height="80" rx="20"/>
<rect x="56" y="140" width="86" height="40" rx="8" fill="#D9503B"/>
</g>
<circle cx="99" cy="104" r="16" fill="#F6D365" stroke="{INK}" stroke-width="5"/>
<circle cx="94" cy="99" r="5" fill="#FFFFFF" opacity="0.8"/>
<path d="M64 150 H134 M64 166 H134" stroke="{INK}" stroke-width="3" opacity="0.4"/>
""")),
"hero-cape": dict(collection="hero-squad", name="Hero Cape", category="retro", tags=["minimal"], rope="thread",
  desc="Flutters even indoors.", anchor=(0.5, 0.1), svg=svg(f"""
<path d="M62 22 L138 22 C 150 80, 168 138, 184 184 Q 142 168 100 184 Q 58 168 16 184 C 32 138, 50 80, 62 22 Z" fill="#D9503B" {W}/>
<path d="M78 40 C 72 90, 60 140, 50 176 M122 40 C 128 90, 140 140, 150 176 M100 40 V178" fill="none" stroke="#B03A28" stroke-width="5" stroke-linecap="round"/>
<rect x="56" y="14" width="88" height="18" rx="9" fill="#E6B450" stroke="{INK}" stroke-width="5"/>
<circle cx="100" cy="23" r="6" fill="#F6D365" stroke="{INK}" stroke-width="3"/>
""")),
"pow": dict(collection="hero-squad", name="POW!", category="retro", tags=["cute"], rope="minimal",
  desc="Sound effects included.", anchor=(0.5, 0.06), svg=svg(f"""
<polygon points="{burst(100, 102, 90, 58, 12)}" fill="#F6D365" stroke="{INK}" stroke-width="6" stroke-linejoin="round"/>
<polygon points="{burst(100, 102, 62, 44, 12)}" fill="#EE9B45"/>
<text x="100" y="122" text-anchor="middle" font-family="Impact, Arial Black, Helvetica, sans-serif" font-weight="900" font-size="52" fill="#D9503B" stroke="{INK}" stroke-width="4" paint-order="stroke" transform="rotate(-8 100 110)">POW!</text>
""")),
# ---------- Wizard School ----------
"wand": dict(collection="wizard-school", name="Wand", category="minimal", tags=["cute"], rope="thread",
  desc="Mostly for pointing at things dramatically.", anchor=(0.5, 0.05), svg=svg(f"""
<path d="M90 12 L110 12 L106 146 L94 146 Z" fill="#5B3A24" {W}/>
<path d="M90 30 H110 M91 46 H109 M91 62 H109" stroke="#8A5A3B" stroke-width="5"/>
<g fill="#F6D365" stroke="{INK}" stroke-width="4" stroke-linejoin="round">
<path d="M100 150 l6 14 l15 2 l-11 10 l3 15 l-13 -8 l-13 8 l3 -15 l-11 -10 l15 -2 Z"/>
<path d="M136 128 l3 7 l7 1 l-5 5 l1 7 l-6 -4 l-6 4 l1 -7 l-5 -5 l7 -1 Z"/>
<path d="M62 138 l3 7 l7 1 l-5 5 l1 7 l-6 -4 l-6 4 l1 -7 l-5 -5 l7 -1 Z"/>
</g>
""")),
"potion": dict(collection="wizard-school", name="Potion", category="cute", tags=["minimal"], rope="cord",
  desc="Tastes like blueberries and confidence.", anchor=(0.5, 0.06), svg=svg(f"""
<rect x="84" y="12" width="32" height="20" rx="5" fill="#A46E45" {W}/>
<path d="M86 32 H114 V72 C 146 82, 160 106, 158 130 C 156 164, 130 186, 100 186 C 70 186, 44 164, 42 130 C 40 106, 54 82, 86 72 Z" fill="#E8F4F8" {W}/>
<path d="M46 122 C 70 112, 130 132, 154 120 C 156 160, 130 182, 100 182 C 70 182, 44 160, 46 122 Z" fill="#9A6BD6"/>
<path d="M86 32 H114 V72 C 146 82, 160 106, 158 130 C 156 164, 130 186, 100 186 C 70 186, 44 164, 42 130 C 40 106, 54 82, 86 72 Z" fill="none" {W}/>
<circle cx="84" cy="146" r="7" fill="#C9AEF0"/><circle cx="112" cy="160" r="5" fill="#C9AEF0"/><circle cx="120" cy="138" r="4" fill="#C9AEF0"/>
<path d="M60 112 C 60 100, 66 92, 74 88" {GLOSS}/>
""")),
"owl": dict(collection="wizard-school", name="Wise Owl", category="cute", tags=["nature"], rope="thread",
  desc="Delivers mail, judges gently.", anchor=(0.5, 0.16), svg=svg(f"""
<path d="M44 52 L58 26 L80 44 Q 100 38 120 44 L142 26 L156 52 C 176 90, 168 172, 100 180 C 32 172, 24 90, 44 52 Z" fill="#A46E45" {W}/>
<path d="M62 120 C 70 150, 130 150, 138 120 C 136 160, 64 160, 62 120 Z" fill="#E6C9A0"/>
<circle cx="76" cy="86" r="22" fill="#FFF6E4" stroke="{INK}" stroke-width="5"/><circle cx="124" cy="86" r="22" fill="#FFF6E4" stroke="{INK}" stroke-width="5"/>
<circle cx="78" cy="88" r="9" fill="{INK}"/><circle cx="122" cy="88" r="9" fill="{INK}"/>
<circle cx="81" cy="85" r="3" fill="#FFFFFF"/><circle cx="125" cy="85" r="3" fill="#FFFFFF"/>
<path d="M92 104 L108 104 L100 118 Z" fill="#EE9B45" stroke="{INK}" stroke-width="4" stroke-linejoin="round"/>
<path d="M84 136 l6 6 l6 -6 M104 136 l6 6 l6 -6 M94 150 l6 6 l6 -6" fill="none" stroke="#8A5A3B" stroke-width="3" stroke-linecap="round"/>
""")),
"spellbook": dict(collection="wizard-school", name="Spellbook", category="minimal", tags=["retro"], rope="chain",
  desc="Chapter one: making tea warmer.", anchor=(0.5, 0.13), svg=svg(f"""
<rect x="38" y="26" width="128" height="150" rx="10" fill="#6B4FA0" {W}/>
<rect x="38" y="26" width="22" height="150" rx="8" fill="#55398A" stroke="{INK}" stroke-width="5"/>
<path d="M146 26 h20 v20 Z M146 176 h20 v-20 Z" fill="#E6B450" stroke="{INK}" stroke-width="4" stroke-linejoin="round"/>
<circle cx="112" cy="100" r="30" fill="none" stroke="#E6B450" stroke-width="5"/>
<path d="M112 76 C 124 86, 124 114, 112 124 C 132 120, 140 92, 112 76 Z" fill="#F6D365"/>
<path d="M98 92 l3 6 l6 1 l-5 4 l1 6 l-5 -3 l-5 3 l1 -6 l-5 -4 l6 -1 Z" fill="#F6D365"/>
<path d="M100 176 L100 196 L108 188 L116 196 L116 176" fill="#D9503B" stroke="{INK}" stroke-width="4" stroke-linejoin="round"/>
""")),
"wizard-hat": dict(collection="wizard-school", name="Wizard Hat", category="minimal", tags=["seasonal"], rope="thread",
  desc="Pointy, by tradition.", anchor=(0.6, 0.06), svg=svg(f"""
<ellipse cx="100" cy="160" rx="86" ry="22" fill="#2C3B5E" {W}/>
<path d="M120 12 C 108 40, 70 90, 52 156 L148 156 C 140 110, 130 70, 132 40 C 132 30, 128 18, 120 12 Z" fill="#3A4E7A" {W}/>
<path d="M58 136 C 86 146, 120 146, 146 136 L 148 156 L 52 156 Z" fill="#E6B450" stroke="{INK}" stroke-width="5" stroke-linejoin="round"/>
<g fill="#F6D365"><circle cx="96" cy="86" r="4"/><circle cx="116" cy="110" r="3"/><circle cx="84" cy="118" r="3"/>
<path d="M112 56 l3 7 l7 1 l-5 5 l1 7 l-6 -4 l-6 4 l1 -7 l-5 -5 l7 -1 Z"/></g>
""")),
# ---------- Galaxy Rebels ----------
"space-helmet": dict(collection="galaxy-rebels", name="Space Helmet", category="space", tags=["retro"], rope="minimal",
  desc="Fishbowl-chic.", anchor=(0.5, 0.06), svg=svg(f"""
<path d="M100 12 V30" stroke="{INK}" stroke-width="6" stroke-linecap="round"/>
<circle cx="100" cy="12" r="6" fill="#D9503B" stroke="{INK}" stroke-width="4"/>
<circle cx="100" cy="104" r="74" fill="#FFFFFF" {W}/>
<rect x="46" y="70" width="108" height="72" rx="34" fill="#2C3B5E" stroke="{INK}" stroke-width="5"/>
<path d="M62 92 C 70 82, 84 78, 98 78" fill="none" stroke="#8EC5E8" stroke-width="7" stroke-linecap="round"/>
<rect x="56" y="168" width="88" height="18" rx="6" fill="#B8BFC8" {W}/>
<circle cx="150" cy="58" r="6" fill="#E6B450"/>
""")),
"ufo": dict(collection="galaxy-rebels", name="Saucer", category="space", tags=["cute", "retro"], rope="thread",
  desc="Just visiting.", anchor=(0.5, 0.28), svg=svg(f"""
<path d="M64 98 C 64 66, 136 66, 136 98 Z" fill="#BFE3F2" {W}/>
<path d="M78 84 C 82 76, 90 72, 98 72" fill="none" stroke="#FFFFFF" stroke-width="6" stroke-linecap="round"/>
<ellipse cx="100" cy="112" rx="88" ry="28" fill="#B8BFC8" {W}/>
<ellipse cx="100" cy="104" rx="58" ry="10" fill="#8E959E"/>
<g fill="#F6D365" stroke="{INK}" stroke-width="3"><circle cx="46" cy="116" r="6"/><circle cx="78" cy="124" r="6"/><circle cx="122" cy="124" r="6"/><circle cx="154" cy="116" r="6"/></g>
<path d="M76 140 L58 190 L142 190 L124 140 Z" fill="#F6D365" opacity="0.35"/>
""")),
"droid": dict(collection="galaxy-rebels", name="Tin Droid", category="space", tags=["cute"], rope="cord",
  desc="Beeps encouragingly.", anchor=(0.5, 0.05), svg=svg(f"""
<path d="M100 10 V40" stroke="{INK}" stroke-width="6" stroke-linecap="round"/>
<circle cx="100" cy="12" r="7" fill="#5CC8C0" stroke="{INK}" stroke-width="4"/>
<rect x="36" y="40" width="128" height="104" rx="24" fill="#D8DEE8" {W}/>
<rect x="24" y="74" width="14" height="36" rx="6" fill="#8E959E" {W}/><rect x="162" y="74" width="14" height="36" rx="6" fill="#8E959E" {W}/>
<circle cx="76" cy="86" r="16" fill="#2C3B5E" stroke="{INK}" stroke-width="5"/><circle cx="124" cy="86" r="16" fill="#2C3B5E" stroke="{INK}" stroke-width="5"/>
<circle cx="80" cy="82" r="5" fill="#5CC8C0"/><circle cx="128" cy="82" r="5" fill="#5CC8C0"/>
<rect x="72" y="114" width="56" height="16" rx="4" fill="#8E959E" stroke="{INK}" stroke-width="4"/>
<path d="M84 114 V130 M100 114 V130 M116 114 V130" stroke="{INK}" stroke-width="3"/>
<rect x="64" y="144" width="72" height="38" rx="10" fill="#B8BFC8" {W}/>
<circle cx="100" cy="163" r="7" fill="#D9503B"/>
""")),
"ray-gun": dict(collection="galaxy-rebels", name="Ray Gun", category="space", tags=["retro"], rope="chain",
  desc="Fires only sparkles.", anchor=(0.5, 0.26), svg=svg(f"""
<path d="M70 108 L58 168 C 56 178, 80 182, 84 172 L96 116 Z" fill="#8A5A3B" {W}/>
<path d="M28 76 C 28 62, 40 54, 60 54 L140 62 C 150 63, 156 70, 156 80 C 156 90, 150 97, 140 98 L60 106 C 40 106, 28 98, 28 84 Z" fill="#D8DEE8" {W}/>
<g fill="#D9503B" stroke="{INK}" stroke-width="4"><ellipse cx="86" cy="80" rx="7" ry="28"/><ellipse cx="108" cy="80" rx="6" ry="24"/></g>
<path d="M156 80 L176 80" stroke="{INK}" stroke-width="10" stroke-linecap="round"/>
<circle cx="186" cy="80" r="9" fill="#5CC8C0" stroke="{INK}" stroke-width="4"/>
<circle cx="48" cy="80" r="10" fill="#E6B450" stroke="{INK}" stroke-width="4"/>
""")),
"alien": dict(collection="galaxy-rebels", name="Little Alien", category="space", tags=["cute"], rope="thread",
  desc="Comes in peace. Mostly naps.", anchor=(0.5, 0.05), svg=svg(f"""
<path d="M80 50 L66 16 M120 50 L134 16" stroke="{INK}" stroke-width="5" stroke-linecap="round"/>
<circle cx="66" cy="14" r="7" fill="#F6D365" stroke="{INK}" stroke-width="4"/><circle cx="134" cy="14" r="7" fill="#F6D365" stroke="{INK}" stroke-width="4"/>
<path d="M100 40 C 160 40, 176 84, 168 116 C 160 152, 128 182, 100 182 C 72 182, 40 152, 32 116 C 24 84, 40 40, 100 40 Z" fill="#8DD18A" {W}/>
<path d="M58 104 C 58 84, 92 88, 90 112 C 88 128, 60 124, 58 104 Z" fill="{INK}"/>
<path d="M142 104 C 142 84, 108 88, 110 112 C 112 128, 140 124, 142 104 Z" fill="{INK}"/>
<circle cx="72" cy="102" r="5" fill="#FFFFFF"/><circle cx="128" cy="102" r="5" fill="#FFFFFF"/>
<path d="M90 150 q 10 8 20 0" fill="none" stroke="{INK}" stroke-width="5" stroke-linecap="round"/>
<path d="M54 64 C 62 54, 74 48, 86 46" {GLOSS}/>
""")),
# ---------- Anime Café ----------
"onigiri": dict(collection="anime-cafe", name="Onigiri", category="cute", tags=["minimal"], rope="thread",
  desc="Tuna mayo, probably.", anchor=(0.5, 0.1), svg=svg(f"""
<path d="M100 20 C 116 20, 124 34, 132 48 L178 136 C 190 160, 176 182, 150 182 L50 182 C 24 182, 10 160, 22 136 L68 48 C 76 34, 84 20, 100 20 Z" fill="#FFFFFF" {W}/>
<path d="M62 132 H138 V182 H62 Z" fill="#2B3A2E" stroke="{INK}" stroke-width="5"/>
{eyes(102, dx=18, r=5)}
<path d="M92 114 q 8 7 16 0" fill="none" stroke="{INK}" stroke-width="5" stroke-linecap="round"/>
{blush(112, dx=34, color="#F7A7B5")}
<path d="M72 64 C 78 52, 84 44, 92 40" fill="none" stroke="#E8EEF4" stroke-width="7" stroke-linecap="round"/>
""")),
"ramen": dict(collection="anime-cafe", name="Ramen", category="cute", tags=["retro"], rope="cord",
  desc="Midnight study fuel.", anchor=(0.66, 0.05), svg=svg(f"""
<path d="M120 12 L150 92 M144 10 L162 92" stroke="#A46E45" stroke-width="8" stroke-linecap="round"/>
<path d="M120 12 L150 92 M144 10 L162 92" stroke="{INK}" stroke-width="2" stroke-linecap="round" opacity="0.4"/>
<path d="M30 96 C 52 84, 80 102, 100 90 C 120 102, 150 84, 170 96" fill="none" stroke="#F6D365" stroke-width="10" stroke-linecap="round"/>
<path d="M22 100 H178 C 176 148, 142 180, 100 180 C 58 180, 24 148, 22 100 Z" fill="#D9503B" {W}/>
<path d="M40 124 H160" stroke="#FFF6E4" stroke-width="6" stroke-dasharray="10 8"/>
<circle cx="64" cy="94" r="14" fill="#FFF6E4" stroke="{INK}" stroke-width="4"/><circle cx="64" cy="94" r="7" fill="#F6B450"/>
<path d="M88 86 q 6 -10 14 0" fill="#8DB38B" stroke="{INK}" stroke-width="3"/>
""")),
"lucky-cat": dict(collection="anime-cafe", name="Lucky Cat", category="cute", tags=["seasonal"], rope="thread",
  desc="Waves good fortune your way.", anchor=(0.5, 0.15), svg=svg(f"""
<path d="M136 66 C 142 40, 150 26, 162 22 C 176 24, 178 46, 168 70 Z" fill="#FFFFFF" {W}/>
<path d="M48 56 L52 28 L76 44 Q 100 38 124 44 L148 28 L152 56 C 166 80, 166 108, 150 122 L156 172 C 156 184, 44 184, 44 172 L50 122 C 34 108, 34 80, 48 56 Z" fill="#FFFFFF" {W}/>
<path d="M56 50 L58 36 L70 46 Z M144 50 L142 36 L130 46 Z" fill="#F7A7A0"/>
<path d="M76 84 q 6 -6 12 0 M112 84 q 6 -6 12 0" fill="none" stroke="{INK}" stroke-width="5" stroke-linecap="round"/>
<path d="M94 98 L106 98 L100 104 Z" fill="#F28C8C"/>
<path d="M58 120 C 80 128, 120 128, 142 120" fill="none" stroke="#D9503B" stroke-width="9" stroke-linecap="round"/>
<circle cx="100" cy="134" r="10" fill="#E6B450" stroke="{INK}" stroke-width="4"/>
<ellipse cx="78" cy="160" rx="16" ry="10" fill="#FFFFFF" stroke="{INK}" stroke-width="4"/>
<path d="M150 70 l8 -8" stroke="#F7A7A0" stroke-width="4" stroke-linecap="round"/>
""")),
"katana": dict(collection="anime-cafe", name="Katana", category="retro", tags=["minimal"], rope="cord",
  desc="Ceremonial. Very sharp-looking.", anchor=(0.5, 0.05), svg=svg(f"""
<rect x="88" y="10" width="24" height="56" rx="6" fill="#2B2320" {W}/>
<path d="M88 18 L112 30 M112 18 L88 30 M88 34 L112 46 M112 34 L88 46 M88 50 L112 62 M112 50 L88 62" stroke="#E6B450" stroke-width="3"/>
<ellipse cx="100" cy="72" rx="26" ry="9" fill="#E6B450" {W}/>
<path d="M90 80 L110 80 L110 176 Q 100 192 90 176 Z" fill="#7A2A20" {W}/>
<path d="M90 120 H110 M90 150 H110" stroke="#E6B450" stroke-width="4"/>
<path d="M96 88 V170" stroke="#FFFFFF" stroke-width="3" opacity="0.35"/>
""")),
"sakura": dict(collection="anime-cafe", name="Sakura", category="nature", tags=["seasonal", "minimal"], rope="thread",
  desc="Blooms all year here.", anchor=(0.5, 0.08), svg=svg(f"""
<g fill="#F7B8C8" stroke="{INK}" stroke-width="5" stroke-linejoin="round">
<path d="M100 104 C 76 76, 80 30, 94 18 L100 30 L106 18 C 120 30, 124 76, 100 104 Z"/>
<path d="M100 104 C 76 76, 80 30, 94 18 L100 30 L106 18 C 120 30, 124 76, 100 104 Z" transform="rotate(72 100 104)"/>
<path d="M100 104 C 76 76, 80 30, 94 18 L100 30 L106 18 C 120 30, 124 76, 100 104 Z" transform="rotate(144 100 104)"/>
<path d="M100 104 C 76 76, 80 30, 94 18 L100 30 L106 18 C 120 30, 124 76, 100 104 Z" transform="rotate(216 100 104)"/>
<path d="M100 104 C 76 76, 80 30, 94 18 L100 30 L106 18 C 120 30, 124 76, 100 104 Z" transform="rotate(288 100 104)"/>
</g>
<circle cx="100" cy="104" r="14" fill="#F6D365" stroke="{INK}" stroke-width="4"/>
<g fill="#D9503B"><circle cx="100" cy="82" r="3"/><circle cx="121" cy="98" r="3"/><circle cx="113" cy="122" r="3"/><circle cx="87" cy="122" r="3"/><circle cx="79" cy="98" r="3"/></g>
""")),
# ---------- Retro Arcade ----------
"joystick": dict(collection="retro-arcade", name="Joystick", category="retro", tags=[], rope="cord",
  desc="Up, up, down, down…", anchor=(0.5, 0.06), svg=svg(f"""
<circle cx="100" cy="36" r="24" fill="#D9503B" {W}/>
<path d="M86 28 C 88 22, 94 18, 100 18" {GLOSS}/>
<rect x="93" y="58" width="14" height="66" rx="5" fill="#2B2320" {W}/>
<path d="M28 132 L172 132 L182 176 L18 176 Z" fill="#2C3B5E" {W}/>
<ellipse cx="100" cy="132" rx="72" ry="12" fill="#3A4E7A" stroke="{INK}" stroke-width="5"/>
<circle cx="146" cy="156" r="8" fill="#F6D365" stroke="{INK}" stroke-width="4"/><circle cx="54" cy="156" r="8" fill="#5CC8C0" stroke="{INK}" stroke-width="4"/>
""")),
"arcade": dict(collection="retro-arcade", name="Arcade Cabinet", category="retro", tags=[], rope="chain",
  desc="High score: you.", anchor=(0.5, 0.06), svg=svg(f"""
<path d="M52 12 L148 12 L148 40 L156 112 L148 116 L148 188 L52 188 L52 116 L44 112 L52 40 Z" fill="#6B4FA0" {W}/>
<rect x="56" y="18" width="88" height="22" rx="3" fill="#F6D365" stroke="{INK}" stroke-width="4"/>
<path d="M66 29 H134" stroke="#D9503B" stroke-width="6" stroke-dasharray="6 5"/>
<rect x="62" y="48" width="76" height="56" rx="6" fill="#1C2740" stroke="{INK}" stroke-width="5"/>
{pixels(["..g..", ".ggg.", "g.g.g", "ggggg", ".g.g."], {"g": "#8DD18A"}, 6, 85, 58)}
<path d="M48 112 L152 112 L148 130 L52 130 Z" fill="#55398A" stroke="{INK}" stroke-width="5" stroke-linejoin="round"/>
<circle cx="76" cy="121" r="5" fill="#D9503B"/><circle cx="118" cy="121" r="5" fill="#F6D365"/><circle cx="132" cy="121" r="5" fill="#5CC8C0"/>
<rect x="84" y="150" width="32" height="20" rx="3" fill="#2B2320"/><rect x="96" y="154" width="8" height="12" fill="#E6B450"/>
""")),
"pixel-heart": dict(collection="retro-arcade", name="Extra Life", category="retro", tags=["cute"], rope="minimal",
  desc="+1 up.", anchor=(0.5, 0.2), svg=svg(f"""
{pixels([".kk...kk.", "krrk.krrk", "krwrrrrrk", "krwrrrrrk", "krrrrrrrk", ".krrrrrk.", "..krrrk..", "...krk...", "....k...."], {"k": "#2B2320", "r": "#E35D6A", "w": "#FFFFFF"}, 18, 19, 38)}
""")),
"cartridge": dict(collection="retro-arcade", name="Game Cartridge", category="retro", tags=["minimal"], rope="cord",
  desc="Blow on it first.", anchor=(0.5, 0.08), svg=svg(f"""
<path d="M40 16 H160 V170 C 160 180, 154 186, 144 186 H56 C 46 186, 40 180, 40 170 Z" fill="#B8BFC8" {W}/>
<path d="M52 16 V40 M68 16 V40 M84 16 V40 M100 16 V40 M116 16 V40 M132 16 V40 M148 16 V40" stroke="#8E959E" stroke-width="5"/>
<rect x="56" y="54" width="88" height="96" rx="6" fill="#FFF6E4" stroke="{INK}" stroke-width="5"/>
<rect x="56" y="54" width="88" height="22" rx="6" fill="#D9503B" stroke="{INK}" stroke-width="5"/>
<path d="M70 132 L92 96 L104 116 L114 104 L132 132 Z" fill="#8DB38B" stroke="{INK}" stroke-width="4" stroke-linejoin="round"/>
<circle cx="120" cy="92" r="7" fill="#F6D365"/>
<path d="M88 168 L112 168" stroke="{INK}" stroke-width="5" stroke-linecap="round"/>
""")),
"pixel-gem": dict(collection="retro-arcade", name="Pixel Gem", category="retro", tags=["minimal"], rope="chain",
  desc="Worth exactly 500 points.", anchor=(0.5, 0.17), svg=svg(f"""
{pixels(["..kkkkk..", ".kwcccbk.", "kwccccbbk", "kccccbbbk", ".kccbbbk.", "..kcbbk..", "...kbk...", "....k...."], {"k": "#2B2320", "c": "#8EE3F0", "b": "#4FAFD0", "w": "#FFFFFF"}, 18, 19, 34)}
""")),
}
for v in NEW.values():
    v.setdefault("collection", "hero-squad")
CHARMS.update(NEW)

SOUNDS = {
    "moon": "glass", "star": "magic", "planet": "glass", "rocket": "laser", "cat": "soft", "ghost": "soft",
    "mushroom": "soft", "leaf": "paper", "clover": "paper", "cloud": "soft", "rainbow": "magic",
    "crystal": "glass", "heart": "pop", "balloon": "pop", "sun": "magic", "cherry": "pop",
    "strawberry": "soft", "donut": "soft", "coffee": "glass", "cactus": "wood", "pumpkin": "wood",
    "snowflake": "glass", "bell": "bell", "coin": "metal", "key": "metal", "dice": "plastic",
    "note": "magic", "cassette": "plastic", "camera": "plastic", "sword": "metal",
    "hero-mask": "soft", "bolt-shield": "metal", "power-glove": "metal", "hero-cape": "paper", "pow": "punch",
    "wand": "magic", "potion": "glass", "owl": "soft", "spellbook": "paper", "wizard-hat": "magic",
    "space-helmet": "glass", "ufo": "laser", "droid": "retro", "ray-gun": "laser", "alien": "laser",
    "onigiri": "soft", "ramen": "wood", "lucky-cat": "bell", "katana": "metal", "sakura": "paper",
    "joystick": "plastic", "arcade": "retro", "pixel-heart": "retro", "cartridge": "plastic", "pixel-gem": "retro",
}

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
        "collection": c.get("collection", "originals"),
        "sound": SOUNDS.get(cid, "soft"),
        "defaultScale": 1,
        "ropeStyle": c["rope"],
        "anchorOffset": {"x": c["anchor"][0], "y": c["anchor"][1]},
        "metadata": {"description": c["desc"], "author": "Dangle"},
    }
    with open(os.path.join(d, "charm.json"), "w") as f:
        json.dump(manifest, f, indent=2)
        f.write("\n")
with open(os.path.join(root, "collections.json"), "w") as f:
    json.dump(COLLECTIONS, f, indent=2)
    f.write("\n")
print("wrote", len(CHARMS), "charms in", len(COLLECTIONS), "collections")

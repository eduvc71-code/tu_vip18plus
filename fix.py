import re

with open('src/components/ProfileCard.tsx', 'r', encoding='utf-8') as f:
    c = f.read()

def process_controls(c, media_type):
    # Find the controls div
    start_tag = f'{{/* Controles al pie: {{< .......... >}} centrados */}}\n            {{{media_type}.length > 1 && (\n              <div className="mt-1.5 flex items-center justify-center gap-2.5">'
    
    start_idx = c.find(start_tag)
    if start_idx == -1:
        return c
    
    end_idx = c.find('</div>\n            )}', start_idx) + len('</div>\n            )}')
    
    controls_block = c[start_idx:end_idx]
    
    # Remove from original
    c = c[:start_idx] + c[end_idx:]
    
    # Modify controls to be inside absolute container
    inner = controls_block.split('<div className="mt-1.5 flex items-center justify-center gap-2.5">')[1].rsplit('</div>', 1)[0]
    
    inner = inner.replace('<button', '<button style={{ pointerEvents: "auto" }}')
    
    new_controls = f'{{{media_type}.length > 1 && (<div className="absolute bottom-2 left-0 right-0 flex items-center justify-center gap-2.5 z-20 pointer-events-none">{inner}</div>) }}'
    
    # Find the end of the relative div. The relative div ends before the start_tag
    # We will just insert new_controls before the </div> that precedes start_idx
    # Search backwards for </div> from start_idx
    insert_idx = c.rfind('</div>', 0, start_idx)
    if insert_idx != -1:
        c = c[:insert_idx] + new_controls + '\n            ' + c[insert_idx:]
        
    return c

c = process_controls(c, 'images')
c = process_controls(c, 'videos')

# Remove gap from media wrapper grid:
c = c.replace('<div className="bg-zinc-950 p-2 sm:p-4 space-y-2.5">', '<div className="bg-zinc-950 p-2 sm:p-4 space-y-1">')

with open('src/components/ProfileCard.tsx', 'w', encoding='utf-8') as f:
    f.write(c)

